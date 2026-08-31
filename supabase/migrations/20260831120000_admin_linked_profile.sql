-- Allows one auth.users identity to own an ADMIN account row and a linked
-- INFLUENCER or COMPANY account row at the same time, so an administrator can
-- test the backoffice and the regular app under a single login. Each row
-- keeps behaving exactly as it does today (same trigger, same RLS, same
-- moderation flow) — only the constraint that forced exactly one row per
-- identity is relaxed to "one row per (identity, role)".

drop index public.accounts_auth_user_id_uidx;
create unique index accounts_auth_user_id_role_uidx
  on public.accounts (auth_user_id, role);

-- Closes a gap this change would otherwise open: today self-approval is
-- impossible only as a side effect of the 1:1 identity/account constraint
-- (an ADMIN row can never hold role IN ('INFLUENCER', 'COMPANY')). Once an
-- identity can own both, nothing else stops an admin from approving their
-- own linked profile — so it must be checked explicitly here.
create or replace function public.app_apply_admin_moderation(
  target_account_id uuid,
  transition_action public.moderation_action,
  transition_reason text,
  expected_account_version integer,
  expected_profile_version integer,
  command_idempotency_key text
)
returns table (
  result_kind text,
  event_id uuid,
  account_id uuid,
  auth_user_id uuid,
  status public.account_status,
  account_version integer,
  profile_version integer,
  auth_effect_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_account_id uuid := public.app_current_account_id();
  actor_auth_user_id uuid := public.app_current_auth_user_id();
  current_account public.accounts%rowtype;
  current_case public.moderation_cases%rowtype;
  current_profile_version integer;
  existing_action public.moderation_action;
  existing_account_id uuid;
  existing_event_id uuid;
  created_event_id uuid;
  created_auth_effect_id uuid;
  last_status_before_ban public.account_status;
  target_status public.account_status;
  transition_time timestamptz := now();
  email_template public.email_template;
begin
  if not public.app_is_admin() then
    raise exception using
      errcode = '42501',
      message = 'moderation_admin_required';
  end if;

  if transition_action not in (
    'APPROVE',
    'REQUEST_CHANGES',
    'SUSPEND',
    'RESTORE',
    'BAN',
    'UNBAN',
    'ARCHIVE'
  )
    or length(trim(coalesce(command_idempotency_key, ''))) not between 8 and 160
    or expected_account_version <= 0
    or expected_profile_version <= 0
  then
    raise exception using
      errcode = '22023',
      message = 'admin_moderation_input_invalid';
  end if;

  select account.*
  into current_account
  from public.accounts account
  where account.id = target_account_id
  for update;

  if current_account.id is null
    or current_account.role not in ('INFLUENCER', 'COMPANY')
  then
    raise exception using
      errcode = '23503',
      message = 'moderated_account_not_found';
  end if;

  if current_account.auth_user_id = actor_auth_user_id then
    raise exception using
      errcode = '42501',
      message = 'moderation_self_approval_forbidden';
  end if;

  select
    event.id,
    event.action,
    moderation_case.account_id
  into
    existing_event_id,
    existing_action,
    existing_account_id
  from public.moderation_events event
  join public.moderation_cases moderation_case
    on moderation_case.id = event.moderation_case_id
  where event.idempotency_key = command_idempotency_key
  limit 1;

  if existing_event_id is not null then
    if existing_action is distinct from transition_action
      or existing_account_id is distinct from target_account_id
    then
      raise exception using
        errcode = '23505',
        message = 'moderation_idempotency_conflict';
    end if;

    if current_account.role = 'INFLUENCER' then
      select profile.version
      into current_profile_version
      from public.creator_profiles profile
      where profile.account_id = target_account_id;
    else
      select profile.version
      into current_profile_version
      from public.company_profiles profile
      where profile.account_id = target_account_id;
    end if;

    select effect.id
    into created_auth_effect_id
    from public.identity_auth_effects effect
    where effect.moderation_event_id = existing_event_id;

    return query
      select
        'ALREADY_APPLIED'::text,
        existing_event_id,
        current_account.id,
        current_account.auth_user_id,
        current_account.status,
        current_account.version,
        current_profile_version,
        created_auth_effect_id;
    return;
  end if;

  if current_account.archived_at is not null then
    raise exception using
      errcode = '23514',
      message = 'moderated_account_archived';
  end if;

  if current_account.version <> expected_account_version then
    raise exception using
      errcode = '40001',
      message = 'admin_moderation_account_stale';
  end if;

  if current_account.role = 'INFLUENCER' then
    select profile.version
    into current_profile_version
    from public.creator_profiles profile
    where profile.account_id = target_account_id
      and profile.archived_at is null
    for update;
  else
    select profile.version
    into current_profile_version
    from public.company_profiles profile
    where profile.account_id = target_account_id
      and profile.archived_at is null
    for update;
  end if;

  if current_profile_version is null
    or current_profile_version <> expected_profile_version
  then
    raise exception using
      errcode = '40001',
      message = 'admin_moderation_profile_stale';
  end if;

  select moderation_case.*
  into current_case
  from public.moderation_cases moderation_case
  where moderation_case.account_id = target_account_id
    and moderation_case.archived_at is null
  for update;

  if current_case.id is null then
    raise exception using
      errcode = '23503',
      message = 'admin_moderation_case_missing';
  end if;

  target_status := case transition_action
    when 'APPROVE' then 'APPROVED'::public.account_status
    when 'REQUEST_CHANGES' then 'CHANGES_REQUESTED'::public.account_status
    when 'SUSPEND' then 'SUSPENDED'::public.account_status
    when 'RESTORE' then 'APPROVED'::public.account_status
    when 'BAN' then 'BANNED'::public.account_status
    when 'ARCHIVE' then current_account.status
    else null
  end;

  if transition_action = 'UNBAN' then
    select event.from_status
    into last_status_before_ban
    from public.moderation_events event
    where event.moderation_case_id = current_case.id
      and event.action = 'BAN'
    order by event.occurred_at desc, event.id desc
    limit 1;
    target_status := last_status_before_ban;
  end if;

  perform public.app_assert_moderation_transition(
    current_account.status,
    target_status,
    transition_action,
    'ADMIN'::public.account_role,
    false,
    transition_reason,
    last_status_before_ban
  );

  insert into public.moderation_events (
    moderation_case_id,
    submission_sequence,
    from_status,
    to_status,
    action,
    reason,
    actor_account_id,
    idempotency_key,
    occurred_at
  )
  values (
    current_case.id,
    current_case.current_submission_sequence,
    current_account.status,
    target_status,
    transition_action,
    nullif(trim(transition_reason), ''),
    actor_account_id,
    command_idempotency_key,
    transition_time
  )
  returning id into created_event_id;

  update public.accounts
  set
    status = target_status,
    approved_at = case
      when transition_action = 'APPROVE' then transition_time
      else approved_at
    end,
    suspended_at = case
      when transition_action = 'SUSPEND' then transition_time
      when transition_action in ('RESTORE', 'UNBAN')
        and target_status <> 'SUSPENDED'
        then null
      else suspended_at
    end,
    banned_at = case
      when transition_action = 'BAN' then transition_time
      when transition_action = 'UNBAN' then null
      else banned_at
    end,
    archived_at = case
      when transition_action = 'ARCHIVE' then transition_time
      else archived_at
    end
  where id = target_account_id;

  update public.moderation_cases
  set
    assigned_admin_account_id = actor_account_id,
    resolved_at = case
      when transition_action = 'REQUEST_CHANGES' then null
      when transition_action = 'UNBAN'
        and target_status in ('PENDING_REVIEW', 'CHANGES_REQUESTED')
        then null
      else transition_time
    end,
    archived_at = case
      when transition_action = 'ARCHIVE' then transition_time
      else archived_at
    end
  where id = current_case.id;

  if transition_action = 'ARCHIVE' then
    if current_account.role = 'INFLUENCER' then
      update public.creator_profiles
      set archived_at = transition_time
      where creator_profiles.account_id = target_account_id
        and creator_profiles.archived_at is null;
    else
      update public.company_profiles
      set archived_at = transition_time
      where company_profiles.account_id = target_account_id
        and company_profiles.archived_at is null;
    end if;
    current_profile_version := current_profile_version + 1;
  end if;

  if transition_action = 'BAN' then
    insert into public.blocked_identities (
      provider,
      identity_key_hash,
      originating_account_id,
      reason,
      blocked_by_account_id,
      blocked_at
    )
    values (
      'EMAIL',
      public.app_identity_key_hash(current_account.operational_email),
      target_account_id,
      trim(transition_reason),
      actor_account_id,
      transition_time
    )
    on conflict (provider, identity_key_hash)
      where unblocked_at is null and archived_at is null
      do nothing;

    insert into public.blocked_identities (
      provider,
      identity_key_hash,
      provider_subject_hash,
      originating_account_id,
      reason,
      blocked_by_account_id,
      blocked_at
    )
    select
      'GOOGLE'::public.identity_provider,
      public.app_identity_key_hash(
        coalesce(
          nullif(identity.identity_data ->> 'email', ''),
          current_account.operational_email
        )
      ),
      public.app_identity_subject_hash(identity.provider_id),
      target_account_id,
      trim(transition_reason),
      actor_account_id,
      transition_time
    from auth.identities identity
    where identity.user_id = current_account.auth_user_id
      and identity.provider = 'google'
    on conflict (provider, identity_key_hash)
      where unblocked_at is null and archived_at is null
      do nothing;
  elsif transition_action = 'UNBAN' then
    update public.blocked_identities
    set
      unblocked_by_account_id = actor_account_id,
      unblocked_at = transition_time,
      unblock_reason = trim(transition_reason)
    where originating_account_id = target_account_id
      and unblocked_at is null
      and archived_at is null;
  end if;

  if transition_action in ('BAN', 'UNBAN') then
    insert into public.identity_auth_effects (
      moderation_event_id,
      account_id,
      auth_user_id,
      action,
      idempotency_key
    )
    values (
      created_event_id,
      target_account_id,
      current_account.auth_user_id,
      transition_action,
      'moderation-auth:' || command_idempotency_key
    )
    returning id into created_auth_effect_id;
  end if;

  email_template := case transition_action
    when 'APPROVE' then 'APPROVED'::public.email_template
    when 'REQUEST_CHANGES' then 'CHANGES_REQUESTED'::public.email_template
    when 'SUSPEND' then 'SUSPENDED'::public.email_template
    when 'RESTORE' then 'RESTORED'::public.email_template
    when 'BAN' then 'BANNED'::public.email_template
    when 'UNBAN' then 'RESTORED'::public.email_template
    else null
  end;

  if email_template is not null then
    insert into public.email_outbox (
      account_id,
      template,
      recipient_email,
      payload,
      idempotency_key
    )
    values (
      target_account_id,
      email_template,
      current_account.operational_email,
      jsonb_strip_nulls(
        jsonb_build_object(
          'action',
          transition_action::text,
          'reason',
          nullif(trim(transition_reason), ''),
          'role',
          current_account.role::text,
          'status',
          target_status::text
        )
      ),
      'moderation-email:' || command_idempotency_key
    );
  end if;

  return query
    select
      'APPLIED'::text,
      created_event_id,
      current_account.id,
      current_account.auth_user_id,
      target_status,
      current_account.version + 1,
      current_profile_version,
      created_auth_effect_id;
end;
$$;

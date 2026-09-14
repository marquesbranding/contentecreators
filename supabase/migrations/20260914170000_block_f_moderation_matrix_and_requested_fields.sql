-- Block F: every admin moderation action becomes available from (almost)
-- any status instead of one fixed path, and REQUEST_CHANGES can record
-- exactly which fields need fixing. RESTORE/UNBAN are kept only so old
-- events still validate; leaving BANNED through any other action now runs
-- the same unban side effects UNBAN used to be the only way to trigger.

alter table public.moderation_events
  add column requested_fields jsonb not null default '[]'::jsonb,
  add constraint moderation_events_requested_fields_check
    check (
      jsonb_typeof(requested_fields) = 'array'
      and octet_length(requested_fields::text) <= 20000
    );

-- Reason is now conditionally required for APPROVE too (reversing a ban or
-- suspension), so the check needs the row's own from_status.
alter table public.moderation_events
  drop constraint moderation_events_reason_check;

alter table public.moderation_events
  add constraint moderation_events_reason_check
    check (
      (
        action <> all (array['REQUEST_CHANGES','SUSPEND','RESTORE','BAN','UNBAN','ARCHIVE']::public.moderation_action[])
        and not (action = 'APPROVE' and from_status in ('SUSPENDED', 'BANNED'))
      )
      or length(trim(reason)) >= 3
    );

--
-- app_moderation_transition_is_allowed: new matrix — APPROVE/REQUEST_CHANGES/
-- SUSPEND/BAN are each allowed from any status but their own destination
-- (ONBOARDING only ever accepts BAN). RESTORE stays for compatibility with
-- old events; UNBAN is still handled entirely in app_assert_moderation_transition.
--
create or replace function public.app_moderation_transition_is_allowed(transition_from public.account_status, transition_to public.account_status, transition_action public.moderation_action) returns boolean
    language sql immutable parallel safe
    set search_path to ''
    as $$
  select
    (transition_action = 'SUBMIT'
      and transition_from = 'ONBOARDING'
      and transition_to = 'PENDING_REVIEW')
    or
    (transition_action = 'RESUBMIT'
      and transition_from = 'CHANGES_REQUESTED'
      and transition_to = 'PENDING_REVIEW')
    or
    (transition_action = 'APPROVE'
      and transition_from in (
        'PENDING_REVIEW',
        'CHANGES_REQUESTED',
        'SUSPENDED',
        'BANNED'
      )
      and transition_to = 'APPROVED')
    or
    (transition_action = 'REQUEST_CHANGES'
      and transition_from in (
        'PENDING_REVIEW',
        'APPROVED',
        'SUSPENDED',
        'BANNED'
      )
      and transition_to = 'CHANGES_REQUESTED')
    or
    (transition_action = 'SUSPEND'
      and transition_from in (
        'PENDING_REVIEW',
        'CHANGES_REQUESTED',
        'APPROVED',
        'BANNED'
      )
      and transition_to = 'SUSPENDED')
    or
    (transition_action = 'BAN'
      and transition_from in (
        'ONBOARDING',
        'PENDING_REVIEW',
        'CHANGES_REQUESTED',
        'APPROVED',
        'SUSPENDED'
      )
      and transition_to = 'BANNED')
    or
    (transition_action = 'RESTORE'
      and transition_from = 'SUSPENDED'
      and transition_to = 'APPROVED');
$$;

--
-- app_assert_moderation_transition: reason is now required for APPROVE too,
-- but only when it reverses a ban or suspension.
--
create or replace function public.app_assert_moderation_transition(transition_from public.account_status, transition_to public.account_status, transition_action public.moderation_action, trusted_actor_role public.account_role, trusted_actor_is_owner boolean, transition_reason text, last_status_before_ban public.account_status default null::public.account_status) returns void
    language plpgsql
    set search_path to ''
    as $$
begin
  if transition_action in ('SUBMIT', 'RESUBMIT') then
    if trusted_actor_role not in ('INFLUENCER', 'COMPANY')
      or not trusted_actor_is_owner
    then
      raise exception using
        errcode = '42501',
        message = 'moderation_owner_required';
    end if;
  elsif trusted_actor_role <> 'ADMIN' then
    raise exception using
      errcode = '42501',
      message = 'moderation_admin_required';
  end if;

  if (
    transition_action in (
      'REQUEST_CHANGES',
      'SUSPEND',
      'RESTORE',
      'BAN',
      'UNBAN',
      'ARCHIVE'
    )
    or (transition_action = 'APPROVE' and transition_from in ('SUSPENDED', 'BANNED'))
  )
    and length(trim(coalesce(transition_reason, ''))) < 3
  then
    raise exception using
      errcode = '22023',
      message = 'moderation_reason_required';
  end if;

  if transition_action = 'ARCHIVE' then
    if transition_from <> transition_to then
      raise exception using
        errcode = '23514',
        message = 'moderation_archive_status_mismatch';
    end if;
    return;
  end if;

  if transition_action = 'UNBAN' then
    if transition_from <> 'BANNED'
      or last_status_before_ban is null
      or last_status_before_ban not in (
        'PENDING_REVIEW',
        'CHANGES_REQUESTED',
        'APPROVED',
        'SUSPENDED'
      )
      or transition_to <> last_status_before_ban
    then
      raise exception using
        errcode = '23514',
        message = 'moderation_unban_target_mismatch';
    end if;
    return;
  end if;

  if not public.app_moderation_transition_is_allowed(
    transition_from,
    transition_to,
    transition_action
  )
  then
    raise exception using
      errcode = '23514',
      message = 'moderation_transition_not_allowed';
  end if;
end;
$$;

--
-- app_apply_admin_moderation: adds transition_requested_fields (only valid
-- with REQUEST_CHANGES), runs the unban side effects (blocked_identities,
-- identity_auth_effects) whenever an account LEAVES BANNED through any
-- action (not just literal UNBAN), and returns which BAN/UNBAN auth effect
-- action was actually recorded (identity_auth_effects.action only accepts
-- BAN/UNBAN, so an APPROVE-from-BANNED still needs to write 'UNBAN' there).
--
drop function public.app_apply_admin_moderation(uuid, public.moderation_action, text, integer, integer, text);

create function public.app_apply_admin_moderation(
  target_account_id uuid,
  transition_action public.moderation_action,
  transition_reason text,
  expected_account_version integer,
  expected_profile_version integer,
  command_idempotency_key text,
  transition_requested_fields jsonb default '[]'::jsonb
) returns table(result_kind text, event_id uuid, account_id uuid, auth_user_id uuid, status public.account_status, account_version integer, profile_version integer, auth_effect_id uuid, auth_effect_action text)
    language plpgsql security definer
    set search_path to ''
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
  created_auth_effect_action text;
  last_status_before_ban public.account_status;
  target_status public.account_status;
  transition_time timestamptz := now();
  email_template public.email_template;
  is_leaving_banned boolean;
  normalized_requested_fields jsonb := coalesce(transition_requested_fields, '[]'::jsonb);
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
    or jsonb_typeof(normalized_requested_fields) <> 'array'
  then
    raise exception using
      errcode = '22023',
      message = 'admin_moderation_input_invalid';
  end if;

  if transition_action <> 'REQUEST_CHANGES'
    and jsonb_array_length(normalized_requested_fields) > 0
  then
    raise exception using
      errcode = '22023',
      message = 'moderation_requested_fields_not_allowed';
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

    select effect.id, effect.action::text
    into created_auth_effect_id, created_auth_effect_action
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
        created_auth_effect_id,
        created_auth_effect_action;
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

  is_leaving_banned := current_account.status = 'BANNED' and target_status <> 'BANNED';

  insert into public.moderation_events (
    moderation_case_id,
    submission_sequence,
    from_status,
    to_status,
    action,
    reason,
    requested_fields,
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
    normalized_requested_fields,
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
      when current_account.status = 'SUSPENDED' and target_status <> 'SUSPENDED'
        then null
      else suspended_at
    end,
    banned_at = case
      when transition_action = 'BAN' then transition_time
      when is_leaving_banned then null
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
      when transition_action = 'ARCHIVE' then transition_time
      when target_status in ('PENDING_REVIEW', 'CHANGES_REQUESTED') then null
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

    created_auth_effect_action := 'BAN';
  elsif is_leaving_banned then
    update public.blocked_identities
    set
      unblocked_by_account_id = actor_account_id,
      unblocked_at = transition_time,
      unblock_reason = trim(transition_reason)
    where originating_account_id = target_account_id
      and unblocked_at is null
      and archived_at is null;

    created_auth_effect_action := 'UNBAN';
  end if;

  if created_auth_effect_action is not null then
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
      created_auth_effect_action::public.moderation_action,
      'moderation-auth:' || command_idempotency_key
    )
    returning id into created_auth_effect_id;
  end if;

  email_template := case transition_action
    when 'APPROVE' then case when is_leaving_banned or current_account.status = 'SUSPENDED' then 'RESTORED'::public.email_template else 'APPROVED'::public.email_template end
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
          'requestedFields',
          case
            when jsonb_array_length(normalized_requested_fields) > 0
              then normalized_requested_fields
            else null
          end,
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
      created_auth_effect_id,
      created_auth_effect_action;
end;
$$;

revoke all on function public.app_apply_admin_moderation(uuid, public.moderation_action, text, integer, integer, text, jsonb) from public;
grant all on function public.app_apply_admin_moderation(uuid, public.moderation_action, text, integer, integer, text, jsonb) to contente_app_user;

comment on column public.moderation_events.requested_fields is
  'Field keys (with an optional note) the admin asked the owner to correct — only ever populated on REQUEST_CHANGES events. See src/features/moderation/domain/correctable-fields.ts.';

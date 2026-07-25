create type public.identity_auth_effect_status as enum (
  'PENDING',
  'SYNCED',
  'FAILED'
);

create table public.identity_auth_effects (
  id uuid primary key default gen_random_uuid(),
  moderation_event_id uuid not null
    references public.moderation_events(id) on delete restrict,
  account_id uuid not null
    references public.accounts(id) on delete restrict,
  auth_user_id uuid not null
    references auth.users(id) on delete restrict,
  action public.moderation_action not null,
  status public.identity_auth_effect_status not null default 'PENDING',
  attempt_count integer not null default 0,
  last_error_category varchar(80),
  synced_at timestamptz,
  idempotency_key varchar(200) not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint identity_auth_effects_action_check
    check (action in ('BAN', 'UNBAN')),
  constraint identity_auth_effects_attempt_count_check
    check (attempt_count >= 0),
  constraint identity_auth_effects_state_check
    check (
      (
        status = 'PENDING'
        and synced_at is null
        and last_error_category is null
      )
      or
      (
        status = 'FAILED'
        and synced_at is null
        and length(trim(last_error_category)) >= 3
      )
      or
      (
        status = 'SYNCED'
        and synced_at is not null
        and last_error_category is null
      )
    ),
  constraint identity_auth_effects_version_check check (version > 0)
);

create unique index identity_auth_effects_event_uidx
  on public.identity_auth_effects (moderation_event_id);
create unique index identity_auth_effects_idempotency_key_uidx
  on public.identity_auth_effects (idempotency_key);
create index identity_auth_effects_retry_idx
  on public.identity_auth_effects (status, updated_at, id)
  where status in ('PENDING', 'FAILED');
create index identity_auth_effects_account_timeline_idx
  on public.identity_auth_effects (account_id, created_at desc, id);

create trigger identity_auth_effects_updated_at_version_trigger
before update on public.identity_auth_effects
for each row execute function public.set_updated_at_and_version();

create trigger identity_auth_effects_audit_revision_trigger
after insert or update or delete on public.identity_auth_effects
for each row execute function public.capture_audit_revision();

alter table public.identity_auth_effects enable row level security;
alter table public.identity_auth_effects force row level security;

grant select on public.identity_auth_effects to contente_app_user;

create policy identity_auth_effects_admin_select_policy
on public.identity_auth_effects
for select
to contente_app_user
using (public.app_is_admin());

drop index public.moderation_events_case_sequence_action_uidx;
create index moderation_events_case_sequence_action_idx
  on public.moderation_events (
    moderation_case_id,
    submission_sequence,
    action
  );

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

create or replace function public.app_complete_identity_auth_effect(
  target_effect_id uuid,
  sync_succeeded boolean,
  sync_error_category text default null
)
returns table (
  effect_status public.identity_auth_effect_status,
  attempt_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_effect public.identity_auth_effects%rowtype;
begin
  if not public.app_is_admin() then
    raise exception using
      errcode = '42501',
      message = 'moderation_admin_required';
  end if;

  select effect.*
  into current_effect
  from public.identity_auth_effects effect
  where effect.id = target_effect_id
  for update;

  if current_effect.id is null then
    raise exception using
      errcode = '23503',
      message = 'identity_auth_effect_not_found';
  end if;

  if current_effect.status = 'SYNCED' then
    return query
      select current_effect.status, current_effect.attempt_count;
    return;
  end if;

  if not sync_succeeded
    and length(trim(coalesce(sync_error_category, ''))) < 3
  then
    raise exception using
      errcode = '22023',
      message = 'identity_auth_effect_error_category_required';
  end if;

  update public.identity_auth_effects
  set
    status = case
      when sync_succeeded then 'SYNCED'::public.identity_auth_effect_status
      else 'FAILED'::public.identity_auth_effect_status
    end,
    attempt_count = current_effect.attempt_count + 1,
    last_error_category = case
      when sync_succeeded then null
      else trim(sync_error_category)
    end,
    synced_at = case when sync_succeeded then now() else null end
  where id = target_effect_id
  returning
    identity_auth_effects.status,
    identity_auth_effects.attempt_count
  into effect_status, attempt_count;

  return next;
end;
$$;

revoke all on function public.app_apply_admin_moderation(
  uuid,
  public.moderation_action,
  text,
  integer,
  integer,
  text
) from public, anon, authenticated, service_role;
revoke all on function public.app_complete_identity_auth_effect(
  uuid,
  boolean,
  text
) from public, anon, authenticated, service_role;

grant execute on function public.app_apply_admin_moderation(
  uuid,
  public.moderation_action,
  text,
  integer,
  integer,
  text
) to contente_app_user;
grant execute on function public.app_complete_identity_auth_effect(
  uuid,
  boolean,
  text
) to contente_app_user;

create or replace function public.app_resubmit_moderation(
  target_account_id uuid,
  expected_account_version integer,
  expected_profile_version integer,
  command_idempotency_key text
)
returns table (
  result_kind text,
  submission_sequence integer,
  account_version integer,
  profile_version integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_auth_user_id uuid := public.app_current_auth_user_id();
  actor_account_id uuid := public.app_current_account_id();
  actor_role public.account_role := public.app_current_role();
  current_account public.accounts%rowtype;
  current_case public.moderation_cases%rowtype;
  current_profile_version integer;
  existing_event_id uuid;
  next_submission_sequence integer;
  transition_time timestamptz := now();
begin
  if length(trim(coalesce(command_idempotency_key, ''))) not between 8 and 160
    or expected_account_version <= 0
    or expected_profile_version <= 0
  then
    raise exception using
      errcode = '22023',
      message = 'moderation_resubmission_input_invalid';
  end if;

  select account.*
  into current_account
  from public.accounts account
  where account.id = target_account_id
    and account.id = actor_account_id
    and account.auth_user_id = actor_auth_user_id
    and account.role = actor_role
    and account.role in ('INFLUENCER', 'COMPANY')
    and account.archived_at is null
  for update;

  if current_account.id is null then
    raise exception using
      errcode = '42501',
      message = 'moderation_resubmission_owner_required';
  end if;

  select event.id
  into existing_event_id
  from public.moderation_events event
  join public.moderation_cases moderation_case
    on moderation_case.id = event.moderation_case_id
  where event.idempotency_key = command_idempotency_key
    and event.action = 'RESUBMIT'
    and moderation_case.account_id = target_account_id
  limit 1;

  if existing_event_id is not null then
    if current_account.role = 'INFLUENCER' then
      select profile.version
      into current_profile_version
      from public.creator_profiles profile
      where profile.account_id = target_account_id
        and profile.archived_at is null;
    else
      select profile.version
      into current_profile_version
      from public.company_profiles profile
      where profile.account_id = target_account_id
        and profile.archived_at is null;
    end if;

    return query
      select
        'ALREADY_APPLIED'::text,
        moderation_case.current_submission_sequence,
        current_account.version,
        current_profile_version
      from public.moderation_cases moderation_case
      where moderation_case.account_id = target_account_id;
    return;
  end if;

  if current_account.status <> 'CHANGES_REQUESTED'
    or public.app_current_status() <> 'CHANGES_REQUESTED'
    or current_account.version not in (
      expected_account_version,
      expected_account_version + 1
    )
  then
    raise exception using
      errcode = '40001',
      message = 'moderation_resubmission_account_stale';
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
    or current_profile_version <> expected_profile_version + 1
  then
    raise exception using
      errcode = '40001',
      message = 'moderation_resubmission_profile_stale';
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
      message = 'moderation_resubmission_case_missing';
  end if;

  next_submission_sequence := current_case.current_submission_sequence + 1;

  update public.moderation_cases
  set
    current_submission_sequence = next_submission_sequence,
    submitted_at = transition_time,
    resolved_at = null
  where id = current_case.id;

  insert into public.moderation_events (
    moderation_case_id,
    submission_sequence,
    from_status,
    to_status,
    action,
    actor_account_id,
    idempotency_key
  )
  values (
    current_case.id,
    next_submission_sequence,
    'CHANGES_REQUESTED',
    'PENDING_REVIEW',
    'RESUBMIT',
    actor_account_id,
    command_idempotency_key
  );

  update public.accounts
  set
    status = 'PENDING_REVIEW',
    submitted_at = transition_time
  where id = target_account_id;

  insert into public.email_outbox (
    account_id,
    template,
    recipient_email,
    payload,
    idempotency_key
  )
  values (
    target_account_id,
    'ONBOARDING_RECEIVED',
    current_account.operational_email,
    jsonb_build_object(
      'role',
      current_account.role::text,
      'submissionSequence',
      next_submission_sequence
    ),
    'onboarding-received:' || command_idempotency_key
  );

  return query
    select
      'APPLIED'::text,
      next_submission_sequence,
      current_account.version + 1,
      current_profile_version;
end;
$$;

revoke all on function public.app_resubmit_moderation(
  uuid,
  integer,
  integer,
  text
) from public, anon, authenticated, service_role;

grant execute on function public.app_resubmit_moderation(
  uuid,
  integer,
  integer,
  text
) to contente_app_user;

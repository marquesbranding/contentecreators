begin;

-- Self-service account deletion: request (immediate hiding), 30-day recovery by
-- an administrator, then elimination within the 120-day legal deadline.
alter table public.accounts
  add column deletion_requested_at timestamptz,
  add column elimination_eligible_at timestamptz,
  add column deletion_due_at timestamptz,
  add column deletion_state text,
  add column deletion_failure_code text,
  add column eliminated_at timestamptz;

alter table public.accounts
  add constraint accounts_deletion_state_check
    check (deletion_state is null or deletion_state in ('REQUESTED', 'FAILED', 'ELIMINATED')),
  add constraint accounts_deletion_consistency_check
    check (
      (
        deletion_state is null
        and deletion_requested_at is null
        and elimination_eligible_at is null
        and deletion_due_at is null
        and eliminated_at is null
      )
      or (
        deletion_state is not null
        and deletion_requested_at is not null
        and elimination_eligible_at >= deletion_requested_at
        and deletion_due_at >= elimination_eligible_at
        and ((deletion_state = 'ELIMINATED') = (eliminated_at is not null))
      )
    );

create index accounts_deletion_queue_idx
  on public.accounts (elimination_eligible_at, id)
  where deletion_state in ('REQUESTED', 'FAILED');

-- Anonymization is the only mutation allowed on immutable history, and only the
-- definer-owned elimination routine can flip the switch: the trigger also
-- requires the statement to run as the function owner, so application roles
-- cannot reach this path by setting the setting themselves.
create or replace function public.reject_immutable_history_mutation()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if tg_op = 'UPDATE'
    and current_user = 'postgres'
    and current_setting('app.anonymization_operation', true) = 'on'
  then
    if tg_table_name = 'audit_revisions'
      and (to_jsonb(new) - 'before_state' - 'after_state')
        = (to_jsonb(old) - 'before_state' - 'after_state')
    then
      return new;
    end if;

    if tg_table_name = 'moderation_events'
      and (to_jsonb(new) - 'reason') = (to_jsonb(old) - 'reason')
    then
      return new;
    end if;
  end if;

  raise exception using
    errcode = '55000',
    message = format('%s is append-only', tg_table_name);
end;
$$;

-- An owner whose deletion is pending is already archived by the time the audit
-- trigger verifies the actor of the very revisions the request creates, so a
-- pending deletion must not make the (trusted) actor unverifiable.
CREATE OR REPLACE FUNCTION public.capture_audit_revision()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  before_snapshot jsonb;
  after_snapshot jsonb;
  identity_snapshot jsonb;
  entity_identifier text;
  revision_operation public.audit_operation;
  actor_account_setting text;
  actor_account uuid;
  actor_type_setting text;
  actor_type_value public.audit_actor_type;
  actor_role_setting text;
  actor_role_value public.account_role;
  verified_actor_role public.account_role;
  source_setting text;
  source_value public.audit_source;
  request_value text;
  reason_value text;
  telemetry jsonb;
begin
  if tg_op <> 'INSERT' then
    before_snapshot := to_jsonb(old);
  end if;

  if tg_op <> 'DELETE' then
    after_snapshot := to_jsonb(new);
  end if;

  identity_snapshot := coalesce(after_snapshot, before_snapshot, '{}'::jsonb);
  entity_identifier := coalesce(
    identity_snapshot ->> 'id',
    nullif(
      concat_ws(
        ':',
        identity_snapshot ->> 'creator_profile_id',
        identity_snapshot ->> 'niche_id'
      ),
      ''
    ),
    identity_snapshot ->> 'account_id',
    identity_snapshot ->> 'outbox_id',
    '[UNKNOWN]'
  );

  revision_operation := case
    when tg_op = 'INSERT' then 'INSERT'::public.audit_operation
    when tg_op = 'DELETE' then 'DELETE'::public.audit_operation
    when before_snapshot ->> 'archived_at' is null
      and after_snapshot ->> 'archived_at' is not null
      then 'ARCHIVE'::public.audit_operation
    when before_snapshot ->> 'archived_at' is not null
      and after_snapshot ->> 'archived_at' is null
      then 'RESTORE'::public.audit_operation
    else 'UPDATE'::public.audit_operation
  end;

  actor_account_setting := nullif(
    current_setting('app.audit.actor_account_id', true),
    ''
  );
  actor_type_setting := nullif(
    current_setting('app.audit.actor_type', true),
    ''
  );
  actor_role_setting := nullif(
    current_setting('app.audit.actor_role', true),
    ''
  );
  source_setting := nullif(
    current_setting('app.audit.source', true),
    ''
  );
  request_value := nullif(
    current_setting('app.audit.request_id', true),
    ''
  );
  reason_value := nullif(
    current_setting('app.audit.reason', true),
    ''
  );

  if actor_account_setting is not null then
    actor_account := actor_account_setting::uuid;
  end if;

  if actor_type_setting is not null then
    actor_type_value := actor_type_setting::public.audit_actor_type;
  end if;

  if actor_role_setting is not null then
    actor_role_value := actor_role_setting::public.account_role;
  end if;

  if source_setting is not null then
    source_value := source_setting::public.audit_source;
  else
    source_value := 'DATABASE';
  end if;

  if actor_account is not null then
    select role
    into verified_actor_role
    from public.accounts
    where id = actor_account
      and (archived_at is null or deletion_state = 'REQUESTED');
  end if;

  if actor_type_value is null
    or (
      actor_type_value in ('USER', 'ADMIN')
      and (
        actor_account is null
        or verified_actor_role is distinct from actor_role_value
        or (
          actor_type_value = 'ADMIN'
          and actor_role_value is distinct from 'ADMIN'
        )
        or (
          actor_type_value = 'USER'
          and actor_role_value = 'ADMIN'
        )
      )
    )
  then
    actor_account := null;
    actor_type_value := 'SYSTEM_UNKNOWN';
    actor_role_value := null;
    source_value := 'DATABASE';

    telemetry := jsonb_build_object(
      'code', 'audit_context_missing',
      'entity_table', tg_table_name,
      'operation', tg_op,
      'source', source_value,
      'request_id', request_value
    );

    perform pg_notify('audit_system_unknown', telemetry::text);
    raise warning 'audit_context_missing: %', telemetry::text;
  end if;

  insert into public.audit_revisions (
    entity_table,
    entity_id,
    operation,
    actor_account_id,
    actor_type,
    actor_role,
    source,
    request_id,
    reason,
    changed_fields,
    before_state,
    after_state
  )
  values (
    tg_table_name,
    entity_identifier,
    revision_operation,
    actor_account,
    actor_type_value,
    actor_role_value,
    source_value,
    request_value,
    reason_value,
    public.audit_changed_fields(before_snapshot, after_snapshot),
    case
      when before_snapshot is null then null
      else public.redact_audit_snapshot(before_snapshot)
    end,
    case
      when after_snapshot is null then null
      else public.redact_audit_snapshot(after_snapshot)
    end
  );

  return null;
end;
$function$;

-- The owner requests the deletion of their own account.
create function public.app_request_account_deletion()
returns table (
  account_id uuid,
  auth_user_id uuid,
  operational_email text,
  account_role public.account_role,
  elimination_eligible_at timestamptz,
  deletion_due_at timestamptz,
  outbox_id uuid
)
language plpgsql
security definer
set search_path to ''
as $$
declare
  current_account public.accounts%rowtype;
  requested_at timestamptz := now();
  created_outbox_id uuid;
begin
  if not public.app_context_is_verified() then
    raise exception using
      errcode = '42501',
      message = 'account_deletion_context_required';
  end if;

  select account.*
  into current_account
  from public.accounts account
  where account.id = public.app_current_account_id()
  for update;

  if current_account.id is null
    or current_account.role not in ('INFLUENCER', 'COMPANY')
  then
    raise exception using
      errcode = '42501',
      message = 'account_deletion_role_forbidden';
  end if;

  if current_account.status = 'BANNED' then
    raise exception using
      errcode = '42501',
      message = 'account_deletion_banned';
  end if;

  if current_account.deletion_requested_at is not null
    or current_account.archived_at is not null
  then
    raise exception using
      errcode = '23514',
      message = 'account_deletion_not_available';
  end if;

  update public.accounts
  set
    deletion_requested_at = requested_at,
    elimination_eligible_at = requested_at + interval '30 days',
    deletion_due_at = requested_at + interval '120 days',
    deletion_state = 'REQUESTED',
    deletion_failure_code = null,
    archived_at = requested_at
  where id = current_account.id;

  -- Same timestamp as the account: recovery restores exactly these rows.
  update public.creator_profiles
  set archived_at = requested_at
  where creator_profiles.account_id = current_account.id
    and creator_profiles.archived_at is null;

  update public.company_profiles
  set archived_at = requested_at
  where company_profiles.account_id = current_account.id
    and company_profiles.archived_at is null;

  -- Revoke the contact authorization; recovery never turns it back on.
  update public.account_contact_preferences
  set
    email_visible_to_approved_companies = false,
    whatsapp_visible_to_approved_companies = false,
    social_visible_to_approved_companies = false
  where account_contact_preferences.account_id = current_account.id
    and account_contact_preferences.archived_at is null;

  insert into public.email_outbox (
    account_id,
    template,
    recipient_email,
    payload,
    idempotency_key
  )
  values (
    current_account.id,
    'ACCOUNT_DELETION_REQUESTED',
    current_account.operational_email,
    jsonb_build_object(
      'recoverableUntil',
      to_char(
        (requested_at + interval '30 days') at time zone 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS"Z"'
      ),
      'eliminationBy',
      to_char(
        (requested_at + interval '120 days') at time zone 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS"Z"'
      )
    ),
    'account-deletion-requested:' || current_account.id || ':'
      || extract(epoch from requested_at)::bigint
  )
  returning id into created_outbox_id;

  return query
    select
      current_account.id,
      current_account.auth_user_id,
      current_account.operational_email::text,
      current_account.role,
      requested_at + interval '30 days',
      requested_at + interval '120 days',
      created_outbox_id;
end;
$$;

revoke all on function public.app_request_account_deletion() from public;
grant execute on function public.app_request_account_deletion() to contente_app_user;

-- An administrator recovers an account during the 30-day window.
create function public.app_admin_recover_account(
  target_account_id uuid,
  recovery_reason text
)
returns table (
  account_id uuid,
  auth_user_id uuid,
  operational_email text,
  account_role public.account_role,
  outbox_id uuid
)
language plpgsql
security definer
set search_path to ''
as $$
declare
  current_account public.accounts%rowtype;
  created_outbox_id uuid;
begin
  if not public.app_is_admin() then
    raise exception using
      errcode = '42501',
      message = 'account_recovery_admin_required';
  end if;

  if length(trim(coalesce(recovery_reason, ''))) < 3 then
    raise exception using
      errcode = '22023',
      message = 'account_recovery_reason_required';
  end if;

  select account.*
  into current_account
  from public.accounts account
  where account.id = target_account_id
  for update;

  if current_account.id is null
    or current_account.deletion_state is distinct from 'REQUESTED'
  then
    raise exception using
      errcode = '23514',
      message = 'account_recovery_not_pending';
  end if;

  if now() >= current_account.elimination_eligible_at then
    raise exception using
      errcode = '23514',
      message = 'account_recovery_window_closed';
  end if;

  update public.creator_profiles
  set archived_at = null
  where creator_profiles.account_id = current_account.id
    and creator_profiles.archived_at = current_account.deletion_requested_at;

  update public.company_profiles
  set archived_at = null
  where company_profiles.account_id = current_account.id
    and company_profiles.archived_at = current_account.deletion_requested_at;

  update public.accounts
  set
    archived_at = null,
    deletion_requested_at = null,
    elimination_eligible_at = null,
    deletion_due_at = null,
    deletion_state = null,
    deletion_failure_code = null
  where id = current_account.id;

  insert into public.email_outbox (
    account_id,
    template,
    recipient_email,
    payload,
    idempotency_key
  )
  values (
    current_account.id,
    'ACCOUNT_RECOVERED',
    current_account.operational_email,
    '{}'::jsonb,
    'account-recovered:' || current_account.id || ':'
      || extract(epoch from clock_timestamp())::bigint
  )
  returning id into created_outbox_id;

  return query
    select
      current_account.id,
      current_account.auth_user_id,
      current_account.operational_email::text,
      current_account.role,
      created_outbox_id;
end;
$$;

revoke all on function public.app_admin_recover_account(uuid, text) from public;
grant execute on function public.app_admin_recover_account(uuid, text) to contente_app_user;

-- Eliminates the personal data of one account after its recovery window. It
-- runs only for the scheduled routine (service role / owner); Storage objects
-- and the Auth identity are removed by the application around this call.
create function public.app_eliminate_account_data(target_account_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  current_account public.accounts%rowtype;
  creator_ids uuid[];
  company_ids uuid[];
  location_ids uuid[];
  social_ids uuid[];
  snapshot_ids uuid[];
  media_ids uuid[];
  outbox_ids uuid[];
  confirmation_ids uuid[];
  contact_ids uuid[];
  consent_ids uuid[];
  entity_ids text[];
begin
  select account.*
  into current_account
  from public.accounts account
  where account.id = target_account_id
  for update;

  if current_account.id is null
    or current_account.deletion_state not in ('REQUESTED', 'FAILED')
  then
    raise exception using
      errcode = '23514',
      message = 'account_elimination_not_applicable';
  end if;

  if now() < current_account.elimination_eligible_at then
    raise exception using
      errcode = '23514',
      message = 'account_elimination_window_open';
  end if;

  select coalesce(array_agg(id), '{}') into creator_ids
  from public.creator_profiles where account_id = current_account.id;
  select coalesce(array_agg(id), '{}') into company_ids
  from public.company_profiles where account_id = current_account.id;

  if exists (
    select 1
    from public.sponsorship_placements placement
    where placement.advertiser_account_id = current_account.id
      or placement.featured_creator_profile_id = any (creator_ids)
  ) then
    raise exception using
      errcode = '23503',
      message = 'account_elimination_blocked_by_sponsorship';
  end if;

  select coalesce(array_agg(id), '{}') into location_ids
  from public.company_locations where company_profile_id = any (company_ids);
  select coalesce(array_agg(id), '{}') into social_ids
  from public.social_profiles where owner_account_id = current_account.id;
  select coalesce(array_agg(id), '{}') into snapshot_ids
  from public.creator_metric_snapshots where creator_profile_id = any (creator_ids);
  select coalesce(array_agg(id), '{}') into media_ids
  from public.media_assets where owner_account_id = current_account.id;
  select coalesce(array_agg(id), '{}') into outbox_ids
  from public.email_outbox where account_id = current_account.id;
  select coalesce(array_agg(id), '{}') into confirmation_ids
  from public.whatsapp_contact_confirmations
  where company_account_id = current_account.id
    or creator_profile_id = any (creator_ids);
  select coalesce(array_agg(id), '{}') into contact_ids
  from public.account_contact_preferences where account_id = current_account.id;
  select coalesce(array_agg(id), '{}') into consent_ids
  from public.account_consents where account_id = current_account.id;

  perform set_config('app.anonymization_operation', 'on', true);

  delete from public.whatsapp_contact_confirmations where id = any (confirmation_ids);
  delete from public.creator_metric_snapshots where id = any (snapshot_ids);
  delete from public.creator_niches where creator_profile_id = any (creator_ids);
  delete from public.social_profiles where id = any (social_ids);
  delete from public.company_locations where id = any (location_ids);
  delete from public.creator_profiles where id = any (creator_ids);
  delete from public.company_profiles where id = any (company_ids);
  update public.media_assets set replaced_by_asset_id = null where id = any (media_ids);
  delete from public.media_assets where id = any (media_ids);
  delete from public.onboarding_drafts where account_id = current_account.id;

  update public.email_outbox
  set recipient_email = 'eliminated@eliminated.invalid', payload = '{}'::jsonb
  where id = any (outbox_ids);

  -- Keep only what proves the acceptance: document version, hash and date.
  update public.account_consents
  set request_id = null, network_key_hash = null, user_agent_hash = null, context = '{}'::jsonb
  where id = any (consent_ids);

  update public.moderation_events
  set reason = '[removido]'
  where reason is not null
    and moderation_case_id in (
      select moderation_case.id
      from public.moderation_cases moderation_case
      where moderation_case.account_id = current_account.id
    );

  -- Runs before the audit scrub so the revision it creates is scrubbed too.
  update public.accounts
  set
    full_name = null,
    operational_email = format('eliminated-%s@eliminated.invalid', current_account.id),
    deletion_state = 'ELIMINATED',
    deletion_failure_code = null,
    eliminated_at = now()
  where id = current_account.id;

  entity_ids := array(
    select unnest(
      array[current_account.id]
      || creator_ids || company_ids || location_ids || social_ids || snapshot_ids
      || media_ids || outbox_ids || confirmation_ids || contact_ids
      || consent_ids
    )::text
  );

  update public.audit_revisions
  set
    before_state = case when before_state is null then null else '{"redacted": true}'::jsonb end,
    after_state = case when after_state is null then null else '{"redacted": true}'::jsonb end
  where entity_id = any (entity_ids)
    and (before_state is not null or after_state is not null);

  perform set_config('app.anonymization_operation', 'off', true);
end;
$$;

revoke all on function public.app_eliminate_account_data(uuid) from public, anon, authenticated, contente_app_user;
grant execute on function public.app_eliminate_account_data(uuid) to service_role;

commit;

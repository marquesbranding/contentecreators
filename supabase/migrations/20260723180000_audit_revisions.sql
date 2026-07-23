create or replace function public.redact_audit_snapshot(snapshot jsonb)
returns jsonb
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(
    jsonb_object_agg(
      entry.key,
      case
        when lower(entry.key) = any (
          array[
            'access_token',
            'authorization',
            'cnpj',
            'email',
            'encrypted_password',
            'identity_key_hash',
            'network_key_hash',
            'object_path',
            'operational_email',
            'password',
            'payload',
            'provider_subject_hash',
            'raw_provider_response',
            'recipient_email',
            'recovery_token',
            'refresh_token',
            'service_role_key',
            'signed_url',
            'smtp_password',
            'smtp_secret',
            'supabase_service_role_key',
            'user_agent_hash',
            'whatsapp',
            'whatsapp_e164'
          ]
        )
        or lower(entry.key) like '%\_password' escape '\'
        or lower(entry.key) like '%\_secret' escape '\'
        or lower(entry.key) like '%\_token' escape '\'
        or lower(entry.key) like '%\_signed_url' escape '\'
          then to_jsonb('[REDACTED]'::text)
        else entry.value
      end
    ),
    '{}'::jsonb
  )
  from jsonb_each(coalesce(snapshot, '{}'::jsonb)) as entry;
$$;

create or replace function public.audit_changed_fields(
  before_snapshot jsonb,
  after_snapshot jsonb
)
returns text[]
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(array_agg(keys.key order by keys.key), '{}'::text[])
  from (
    select jsonb_object_keys(coalesce(before_snapshot, '{}'::jsonb)) as key
    union
    select jsonb_object_keys(coalesce(after_snapshot, '{}'::jsonb)) as key
  ) as keys
  where before_snapshot -> keys.key is distinct from after_snapshot -> keys.key;
$$;

create or replace function public.capture_audit_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
      and archived_at is null;
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
$$;

revoke all on function public.capture_audit_revision() from public;

do $$
declare
  audited_table text;
begin
  foreach audited_table in array array[
    'account_consents',
    'account_contact_preferences',
    'accounts',
    'blocked_identities',
    'company_locations',
    'company_profiles',
    'creator_metric_snapshots',
    'creator_niches',
    'creator_profiles',
    'email_attempts',
    'email_outbox',
    'legal_documents',
    'media_assets',
    'moderation_cases',
    'moderation_events',
    'niches',
    'social_profiles',
    'sponsorship_placements'
  ]
  loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.capture_audit_revision()',
      audited_table || '_audit_revision_trigger',
      audited_table
    );
  end loop;
end;
$$;

create trigger audit_revisions_immutable_trigger
before update or delete on public.audit_revisions
for each row execute function public.reject_immutable_history_mutation();

revoke update, delete on public.audit_revisions
  from anon, authenticated, service_role;
revoke update, delete on public.moderation_events
  from anon, authenticated, service_role;

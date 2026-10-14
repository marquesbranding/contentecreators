begin;

-- Revisão 04 (D10): a exclusão de conta pelo titular passa a ser imediata e
-- definitiva. Sem janela de 30 dias, sem recuperação administrativa e sem ban
-- no Auth: a conta vira tombstone sem vínculo de login, e o mesmo login pode se
-- cadastrar de novo, no mesmo papel ou em outro.
--
-- Esta migration é estrutural. Ela NÃO elimina contas antigas em REQUESTED: isso
-- depende de confirmação do cliente e roda pelo script de operação
-- `scripts/eliminate-legacy-account-deletions.ts` (docs/operations/account-deletion.md).

-- 1. A tombstone perde o vínculo de login. Só uma conta eliminada pode ficar sem
-- auth_user_id; o índice único (auth_user_id, role) trata nulos como distintos,
-- então várias tombstones não conflitam e o login fica livre para um novo
-- cadastro. Resolvers e policies comparam auth_user_id por igualdade, o que
-- nunca casa com nulo.
alter table public.accounts
  alter column auth_user_id drop not null;

alter table public.accounts
  add constraint accounts_auth_user_link_check
    check (
      auth_user_id is not null
      or deletion_state is not distinct from 'ELIMINATED'
    );

-- 2. Um patrocínio "Criador em destaque" arquivado pode perder o criador: a
-- exclusão arquiva o patrocínio e solta a referência em vez de falhar.
alter table public.sponsorship_placements
  drop constraint sponsorship_placements_featured_creator_check;

alter table public.sponsorship_placements
  add constraint sponsorship_placements_featured_creator_check
    check (
      placement_type <> 'FEATURED_CREATOR'
      or featured_creator_profile_id is not null
      or archived_at is not null
    );

-- 3. Fila de limpeza do Storage. Só bucket e caminho (o caminho começa pelo id
-- da conta, que não é dado pessoal); nenhuma policy: só o dono do banco
-- (rotinas do servidor) lê e escreve.
create table public.storage_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  bucket_name text not null,
  object_path text not null,
  attempt_count integer not null default 0,
  last_error_code varchar(80),
  last_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  constraint storage_cleanup_queue_bucket_check
    check (bucket_name in ('profile-media', 'sponsorship-media')),
  constraint storage_cleanup_queue_object_path_check
    check (
      object_path !~ '(^/|\.\.|//)'
      and length(object_path) between 3 and 1024
    ),
  constraint storage_cleanup_queue_attempt_count_check
    check (attempt_count >= 0)
);

create unique index storage_cleanup_queue_object_uidx
  on public.storage_cleanup_queue (bucket_name, object_path);

create index storage_cleanup_queue_due_idx
  on public.storage_cleanup_queue (created_at, id);

comment on table public.storage_cleanup_queue is
  'Storage objects of deleted accounts still to be removed. Bucket and path only, never personal data.';

alter table public.storage_cleanup_queue enable row level security;
alter table public.storage_cleanup_queue force row level security;
revoke all on table public.storage_cleanup_queue
  from public, anon, authenticated, contente_app_user;

-- 4. O e-mail de confirmação precisa do destinatário até ser enviado. Com
-- retain_until_sent, o próprio banco anonimiza destinatário e payload quando a
-- linha chega a SENT ou DEAD_LETTER, qualquer que seja o caminho do update
-- (worker, cron ou backoffice).
alter table public.email_outbox
  add column retain_until_sent boolean not null default false;

create function public.scrub_retained_email_outbox()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if new.retain_until_sent
    and new.status in (
      'SENT'::public.email_outbox_status,
      'DEAD_LETTER'::public.email_outbox_status
    )
  then
    new.recipient_email := 'eliminated@eliminated.invalid';
    new.payload := '{}'::jsonb;
    new.retain_until_sent := false;
  end if;

  return new;
end;
$$;

revoke all on function public.scrub_retained_email_outbox()
  from public, anon, authenticated, service_role, contente_app_user;

create trigger email_outbox_retained_scrub_trigger
  before update on public.email_outbox
  for each row
  execute function public.scrub_retained_email_outbox();

-- 5. Auditoria: o titular é o ator da própria exclusão, e a tombstone já está
-- arquivada quando o gatilho verifica o ator das últimas revisões da mesma
-- transação. Aceita só a conta eliminada nesta transação (eliminated_at =
-- now()); a exceção para REQUESTED sai junto com o pedido com janela.
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
      and (
        archived_at is null
        or (deletion_state = 'ELIMINATED' and eliminated_at = now())
      );
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

-- 6. Saem o pedido com janela, a recuperação administrativa e a eliminação
-- agendada com checagem de janela.
drop function if exists public.app_request_account_deletion();
drop function if exists public.app_admin_recover_account(uuid, text);
drop function if exists public.app_eliminate_account_data(uuid);

-- Immutable history. The only exception is the redaction inside
-- app_erase_account_data() (postgres owner + transaction-local switch). Audit
-- rows may lose their snapshots and their admin free-text reason (only to the
-- marker); moderation events may lose their reason (only to the marker) and the
-- notes of requested_fields, keeping the list and every field key. Any other
-- change, and every delete, is rejected.
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
      and (to_jsonb(new) - 'before_state' - 'after_state' - 'reason')
        = (to_jsonb(old) - 'before_state' - 'after_state' - 'reason')
      and (
        (to_jsonb(new) ->> 'reason') is not distinct from (to_jsonb(old) ->> 'reason')
        or (to_jsonb(new) ->> 'reason') = '[removido]'
      )
    then
      return new;
    end if;

    if tg_table_name = 'moderation_events'
      and (to_jsonb(new) - 'reason' - 'requested_fields')
        = (to_jsonb(old) - 'reason' - 'requested_fields')
      and (
        (to_jsonb(new) ->> 'reason') is not distinct from (to_jsonb(old) ->> 'reason')
        or (to_jsonb(new) ->> 'reason') = '[removido]'
      )
      and (
        select coalesce(jsonb_agg(entry.value -> 'field' order by entry.ordinality), '[]'::jsonb)
        from jsonb_array_elements(to_jsonb(new) -> 'requested_fields')
          with ordinality as entry(value, ordinality)
      ) = (
        select coalesce(jsonb_agg(entry.value -> 'field' order by entry.ordinality), '[]'::jsonb)
        from jsonb_array_elements(to_jsonb(old) -> 'requested_fields')
          with ordinality as entry(value, ordinality)
      )
      and not exists (
        select 1
        from jsonb_array_elements(to_jsonb(new) -> 'requested_fields') as entry(value)
        where coalesce(jsonb_typeof(entry.value -> 'note'), 'null') <> 'null'
      )
    then
      return new;
    end if;
  end if;

  raise exception using
    errcode = '55000',
    message = format('%s is append-only', tg_table_name);
end;
$$;

-- 7. Núcleo da eliminação, aplicando a matriz de disposição aprovada. Não é
-- security definer e ninguém além do dono pode executá-la: só as duas funções
-- abaixo (definer) a chamam, já com a conta travada e validada. Devolve os
-- objetos de Storage a remover, que também ficam na fila de limpeza.
create function public.app_erase_account_data(target_account_id uuid)
returns jsonb
language plpgsql
set search_path to ''
as $$
declare
  current_account public.accounts%rowtype;
  erased_at timestamptz := now();
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
  moderation_event_ids uuid[];
  moderation_case_ids uuid[];
  identity_effect_ids uuid[];
  account_keys text[];
  creator_keys text[];
  company_keys text[];
  location_keys text[];
  social_keys text[];
  snapshot_keys text[];
  media_keys text[];
  outbox_keys text[];
  confirmation_keys text[];
  contact_keys text[];
  consent_keys text[];
  moderation_event_keys text[];
  moderation_case_keys text[];
  identity_effect_keys text[];
  storage_objects jsonb;
begin
  select account.*
  into current_account
  from public.accounts account
  where account.id = target_account_id
  for update;

  if current_account.id is null
    or current_account.role is null
    or current_account.role not in ('INFLUENCER', 'COMPANY')
  then
    raise exception using
      errcode = '42501',
      message = 'account_erasure_role_forbidden';
  end if;

  select coalesce(array_agg(id), '{}') into creator_ids
  from public.creator_profiles where account_id = current_account.id;
  select coalesce(array_agg(id), '{}') into company_ids
  from public.company_profiles where account_id = current_account.id;
  select coalesce(array_agg(id), '{}') into location_ids
  from public.company_locations where company_profile_id = any (company_ids);
  select coalesce(array_agg(id), '{}') into social_ids
  from public.social_profiles where owner_account_id = current_account.id;
  select coalesce(array_agg(id), '{}') into snapshot_ids
  from public.creator_metric_snapshots
  where creator_profile_id = any (creator_ids)
    or social_profile_id = any (social_ids);
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
  select coalesce(array_agg(event.id), '{}') into moderation_event_ids
  from public.moderation_events event
  join public.moderation_cases moderation_case
    on moderation_case.id = event.moderation_case_id
  where moderation_case.account_id = current_account.id;
  select coalesce(array_agg(id), '{}') into moderation_case_ids
  from public.moderation_cases where account_id = current_account.id;
  select coalesce(array_agg(id), '{}') into identity_effect_ids
  from public.identity_auth_effects where account_id = current_account.id;

  -- Patrocínios nunca bloqueiam a exclusão: os que têm a conta como anunciante
  -- ou o criador em destaque são arquivados e param de renderizar. O destaque
  -- perde a referência ao perfil; o anunciante continua apontando para a
  -- tombstone, que permanece.
  update public.sponsorship_placements placement
  set
    archived_at = coalesce(placement.archived_at, erased_at),
    is_active = false,
    featured_creator_profile_id = case
      when placement.featured_creator_profile_id = any (creator_ids) then null
      else placement.featured_creator_profile_id
    end,
    creative_asset_id = case
      when placement.creative_asset_id = any (media_ids) then null
      else placement.creative_asset_id
    end,
    creative_asset_tablet_id = case
      when placement.creative_asset_tablet_id = any (media_ids) then null
      else placement.creative_asset_tablet_id
    end,
    creative_asset_mobile_id = case
      when placement.creative_asset_mobile_id = any (media_ids) then null
      else placement.creative_asset_mobile_id
    end
  where placement.advertiser_account_id = current_account.id
    or placement.featured_creator_profile_id = any (creator_ids)
    or placement.creative_asset_id = any (media_ids)
    or placement.creative_asset_tablet_id = any (media_ids)
    or placement.creative_asset_mobile_id = any (media_ids);

  -- Caminhos de Storage, coletados antes de apagar media_assets: os registrados
  -- e, por segurança, qualquer objeto órfão sob a pasta da conta.
  insert into public.storage_cleanup_queue (bucket_name, object_path)
  select media.bucket_name, media.object_path
  from public.media_assets media
  where media.id = any (media_ids)
  on conflict (bucket_name, object_path) do nothing;

  begin
    insert into public.storage_cleanup_queue (bucket_name, object_path)
    select object.bucket_id, object.name
    from storage.objects object
    where object.bucket_id = 'profile-media'
      and split_part(object.name, '/', 1) = current_account.id::text
    on conflict (bucket_name, object_path) do nothing;
  exception
    when insufficient_privilege or undefined_table then
      -- Sem acesso ao catálogo do Storage, fica só o que media_assets registra.
      null;
  end;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('bucket', queued.bucket_name, 'path', queued.object_path)
      order by queued.bucket_name, queued.object_path
    ),
    '[]'::jsonb
  )
  into storage_objects
  from public.storage_cleanup_queue queued
  where (queued.bucket_name, queued.object_path) in (
    select media.bucket_name, media.object_path
    from public.media_assets media
    where media.id = any (media_ids)
  )
    or (
      queued.bucket_name = 'profile-media'
      and split_part(queued.object_path, '/', 1) = current_account.id::text
    );

  perform set_config('app.anonymization_operation', 'on', true);

  -- DELETE
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

  -- Auth sync effects tie the login (auth_user_id) to this account's moderation
  -- history. The tombstone keeps no such link: the login is free again. No FK
  -- points at identity_auth_effects, so the delete is safe.
  delete from public.identity_auth_effects where id = any (identity_effect_ids);

  -- ANONYMIZE: e-mails ainda não enviados são cancelados (o destinatário deixa
  -- de existir) e todos perdem destinatário e payload.
  update public.email_outbox
  set
    status = 'DEAD_LETTER'::public.email_outbox_status,
    last_error_category = 'ACCOUNT_DELETED',
    last_error_code = null,
    locked_at = null,
    locked_by = null
  where id = any (outbox_ids)
    and status in (
      'PENDING'::public.email_outbox_status,
      'PROCESSING'::public.email_outbox_status,
      'FAILED'::public.email_outbox_status
    );

  update public.email_outbox
  set
    recipient_email = 'eliminated@eliminated.invalid',
    payload = '{}'::jsonb,
    retain_until_sent = false
  where id = any (outbox_ids);

  -- Só o que prova o aceite: versão, hash e data do documento.
  update public.account_consents
  set request_id = null, network_key_hash = null, user_agent_hash = null, context = '{}'::jsonb
  where id = any (consent_ids);

  -- Admin reason and requested_fields notes are free text: both go, while the
  -- list and its field keys stay. The audit revisions this update creates are
  -- redacted by the final scrub below (moderation_event_keys).
  update public.moderation_events event
  set
    reason = case when event.reason is null then null else '[removido]' end,
    requested_fields = (
      select coalesce(
        jsonb_agg(
          case
            when jsonb_typeof(entry.value) = 'object'
              and (entry.value -> 'note') is not null
              then jsonb_set(entry.value, '{note}', 'null'::jsonb)
            else entry.value
          end
          order by entry.ordinality
        ),
        '[]'::jsonb
      )
      from jsonb_array_elements(event.requested_fields)
        with ordinality as entry(value, ordinality)
    )
  where event.id = any (moderation_event_ids)
    and (
      (event.reason is not null and event.reason <> '[removido]')
      or exists (
        select 1
        from jsonb_array_elements(event.requested_fields) as entry(value)
        where coalesce(jsonb_typeof(entry.value -> 'note'), 'null') <> 'null'
      )
    );

  -- Tombstone. Roda antes da limpeza da auditoria para que a revisão que ela
  -- gera também seja anonimizada.
  update public.accounts
  set
    auth_user_id = null,
    full_name = null,
    operational_email = format('eliminated-%s@eliminated.invalid', current_account.id),
    archived_at = coalesce(current_account.archived_at, erased_at),
    deletion_requested_at = coalesce(current_account.deletion_requested_at, erased_at),
    elimination_eligible_at = coalesce(current_account.elimination_eligible_at, erased_at),
    deletion_due_at = coalesce(current_account.deletion_due_at, erased_at),
    deletion_state = 'ELIMINATED',
    deletion_failure_code = null,
    eliminated_at = coalesce(current_account.eliminated_at, erased_at)
  where id = current_account.id;

  -- Audit scrub, last, so it also covers the revisions written by every
  -- statement above. One predicate per entity_table, each on the
  -- (entity_table, entity_id, ...) index. creator_niches ids are
  -- "<creator_profile_id>:<niche_id>", so they match on the creator prefix.
  account_keys := array[current_account.id::text];
  creator_keys := array(select unnest(creator_ids)::text);
  company_keys := array(select unnest(company_ids)::text);
  location_keys := array(select unnest(location_ids)::text);
  social_keys := array(select unnest(social_ids)::text);
  snapshot_keys := array(select unnest(snapshot_ids)::text);
  media_keys := array(select unnest(media_ids)::text);
  outbox_keys := array(select unnest(outbox_ids)::text);
  confirmation_keys := array(select unnest(confirmation_ids)::text);
  contact_keys := array(select unnest(contact_ids)::text);
  consent_keys := array(select unnest(consent_ids)::text);
  moderation_event_keys := array(select unnest(moderation_event_ids)::text);
  moderation_case_keys := array(select unnest(moderation_case_ids)::text);
  identity_effect_keys := array(select unnest(identity_effect_ids)::text);

  update public.audit_revisions revision
  set
    before_state = case when revision.before_state is null then null else '{"redacted": true}'::jsonb end,
    after_state = case when revision.after_state is null then null else '{"redacted": true}'::jsonb end,
    reason = case when revision.reason is null then null else '[removido]' end
  where (
      (revision.entity_table = 'accounts' and revision.entity_id = any (account_keys))
      or (revision.entity_table = 'creator_profiles' and revision.entity_id = any (creator_keys))
      or (revision.entity_table = 'company_profiles' and revision.entity_id = any (company_keys))
      or (revision.entity_table = 'company_locations' and revision.entity_id = any (location_keys))
      or (revision.entity_table = 'social_profiles' and revision.entity_id = any (social_keys))
      or (revision.entity_table = 'creator_metric_snapshots' and revision.entity_id = any (snapshot_keys))
      or (revision.entity_table = 'media_assets' and revision.entity_id = any (media_keys))
      or (revision.entity_table = 'email_outbox' and revision.entity_id = any (outbox_keys))
      or (revision.entity_table = 'whatsapp_contact_confirmations' and revision.entity_id = any (confirmation_keys))
      or (revision.entity_table = 'account_contact_preferences' and revision.entity_id = any (contact_keys))
      or (revision.entity_table = 'account_consents' and revision.entity_id = any (consent_keys))
      or (revision.entity_table = 'moderation_events' and revision.entity_id = any (moderation_event_keys))
      or (revision.entity_table = 'moderation_cases' and revision.entity_id = any (moderation_case_keys))
      or (revision.entity_table = 'identity_auth_effects' and revision.entity_id = any (identity_effect_keys))
      or (
        revision.entity_table = 'creator_niches'
        and split_part(revision.entity_id, ':', 1) = any (creator_keys)
      )
    )
    and (
      (revision.before_state is not null and revision.before_state <> '{"redacted": true}'::jsonb)
      or (revision.after_state is not null and revision.after_state <> '{"redacted": true}'::jsonb)
      or (revision.reason is not null and revision.reason <> '[removido]')
    );

  perform set_config('app.anonymization_operation', 'off', true);

  return storage_objects;
end;
$$;

revoke all on function public.app_erase_account_data(uuid)
  from public, anon, authenticated, service_role, contente_app_user;

-- 8. O titular exclui a própria conta, numa transação auditada. Só a conta do
-- contexto verificado (login + conta + papel + status conferidos), nunca ADMIN
-- nem banida. Uma conta ADMIN do mesmo login (perfil vinculado) não é tocada.
create function public.app_delete_own_account()
returns table (
  account_id uuid,
  outbox_id uuid,
  storage_objects jsonb
)
language plpgsql
security definer
set search_path to ''
as $$
declare
  current_account public.accounts%rowtype;
  erased_objects jsonb;
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
    or current_account.auth_user_id is distinct from public.app_current_auth_user_id()
  then
    raise exception using
      errcode = '42501',
      message = 'account_deletion_context_required';
  end if;

  if current_account.role is null
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

  if current_account.archived_at is not null
    or current_account.deletion_state is not null
  then
    raise exception using
      errcode = '23514',
      message = 'account_deletion_not_available';
  end if;

  erased_objects := public.app_erase_account_data(current_account.id);

  -- Enfileirado depois da eliminação para manter o destinatário até o envio; o
  -- gatilho scrub_retained_email_outbox anonimiza a linha após o envio ou a
  -- falha definitiva.
  insert into public.email_outbox (
    account_id,
    template,
    recipient_email,
    payload,
    idempotency_key,
    retain_until_sent
  )
  values (
    current_account.id,
    'ACCOUNT_DELETION_REQUESTED',
    current_account.operational_email,
    '{}'::jsonb,
    'account-deleted:' || current_account.id,
    true
  )
  returning id into created_outbox_id;

  return query
    select current_account.id, created_outbox_id, erased_objects;
end;
$$;

revoke all on function public.app_delete_own_account()
  from public, anon, authenticated, service_role;
grant execute on function public.app_delete_own_account() to contente_app_user;

-- 9. Repescagem e legado: elimina pelo mesmo núcleo uma conta que ficou do
-- fluxo anterior (REQUESTED ou FAILED) ou desfaz o vínculo de login de uma
-- tombstone antiga. Sem checagem de janela. Só para rotinas do servidor e o
-- script de operação; nunca para o papel da aplicação.
create function public.app_eliminate_account_data(target_account_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  current_account public.accounts%rowtype;
begin
  select account.*
  into current_account
  from public.accounts account
  where account.id = target_account_id
  for update;

  if current_account.id is null
    or not coalesce(
      current_account.deletion_state in ('REQUESTED', 'FAILED')
      or (
        current_account.deletion_state = 'ELIMINATED'
        and current_account.auth_user_id is not null
      ),
      false
    )
  then
    raise exception using
      errcode = '23514',
      message = 'account_elimination_not_applicable';
  end if;

  return public.app_erase_account_data(current_account.id);
end;
$$;

revoke all on function public.app_eliminate_account_data(uuid)
  from public, anon, authenticated, contente_app_user;
grant execute on function public.app_eliminate_account_data(uuid) to service_role;

-- O índice da fila de eliminação com janela não serve mais à repescagem.
drop index if exists public.accounts_deletion_queue_idx;

create index accounts_deletion_pending_idx
  on public.accounts (deletion_due_at, id)
  where deletion_state in ('REQUESTED', 'FAILED');

commit;

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create or replace function public.normalize_search_text(value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(
    extensions.unaccent(
      'extensions.unaccent'::regdictionary,
      coalesce(value, '')
    )
  );
$$;

create type public.account_role as enum (
  'ADMIN',
  'INFLUENCER',
  'COMPANY'
);

create type public.account_status as enum (
  'ONBOARDING',
  'PENDING_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'SUSPENDED',
  'BANNED'
);

create type public.creator_type as enum (
  'INFLUENCER',
  'UGC'
);

create type public.social_platform as enum (
  'INSTAGRAM',
  'TIKTOK',
  'YOUTUBE',
  'FACEBOOK',
  'X',
  'LINKEDIN',
  'OTHER'
);

create type public.creator_metric_source as enum (
  'SELF_REPORTED'
);

create type public.media_kind as enum (
  'AVATAR',
  'COVER',
  'LOGO',
  'SPONSORSHIP_CREATIVE'
);

create type public.media_status as enum (
  'PENDING',
  'ACTIVE',
  'ARCHIVED',
  'REJECTED'
);

create type public.moderation_action as enum (
  'SUBMIT',
  'REQUEST_CHANGES',
  'RESUBMIT',
  'APPROVE',
  'SUSPEND',
  'RESTORE',
  'BAN',
  'UNBAN',
  'ARCHIVE'
);

create type public.placement_type as enum (
  'TOP_BANNER',
  'INLINE_BANNER',
  'CAROUSEL',
  'FEATURED_CREATOR'
);

create type public.placement_audience as enum (
  'ALL',
  'INFLUENCER',
  'COMPANY'
);

create type public.email_template as enum (
  'ONBOARDING_RECEIVED',
  'CHANGES_REQUESTED',
  'APPROVED',
  'SUSPENDED',
  'RESTORED',
  'BANNED'
);

create type public.email_outbox_status as enum (
  'PENDING',
  'PROCESSING',
  'SENT',
  'FAILED',
  'DEAD_LETTER'
);

create type public.email_attempt_status as enum (
  'SENT',
  'FAILED'
);

create type public.legal_document_type as enum (
  'TERMS',
  'PRIVACY',
  'CONTACT_VISIBILITY'
);

create type public.identity_provider as enum (
  'EMAIL',
  'GOOGLE'
);

create type public.audit_operation as enum (
  'INSERT',
  'UPDATE',
  'ARCHIVE',
  'RESTORE',
  'DELETE',
  'PRIVILEGED_READ'
);

create type public.audit_actor_type as enum (
  'USER',
  'ADMIN',
  'SYSTEM',
  'SYSTEM_UNKNOWN'
);

create type public.audit_source as enum (
  'APPLICATION',
  'BACKOFFICE',
  'AUTH_HOOK',
  'CRON',
  'SCRIPT',
  'DATABASE'
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  role public.account_role,
  status public.account_status not null default 'ONBOARDING',
  operational_email varchar(320) not null,
  submitted_at timestamptz,
  approved_at timestamptz,
  suspended_at timestamptz,
  banned_at timestamptz,
  completion_percentage smallint not null default 0,
  completion_version integer not null default 1,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint accounts_completion_percentage_check
    check (completion_percentage between 0 and 100),
  constraint accounts_completion_version_check check (completion_version > 0),
  constraint accounts_version_check check (version > 0),
  constraint accounts_operational_email_check
    check (length(trim(operational_email)) between 3 and 320)
);

create unique index accounts_auth_user_id_uidx
  on public.accounts (auth_user_id);
create index accounts_role_status_idx
  on public.accounts (role, status)
  where archived_at is null;
create index accounts_moderation_queue_idx
  on public.accounts (status, submitted_at, id)
  where archived_at is null and status in ('PENDING_REVIEW', 'CHANGES_REQUESTED');

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_account_id uuid not null references public.accounts(id) on delete restrict,
  bucket_name text not null,
  object_path text not null,
  kind public.media_kind not null,
  mime_type text not null,
  size_bytes bigint not null,
  width integer,
  height integer,
  status public.media_status not null default 'PENDING',
  replaced_by_asset_id uuid references public.media_assets(id) on delete restrict,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint media_assets_bucket_check
    check (bucket_name in ('profile-media', 'sponsorship-media')),
  constraint media_assets_object_path_check
    check (object_path !~ '(^/|\\.\\.|//)' and length(object_path) between 3 and 1024),
  constraint media_assets_mime_type_check
    check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  constraint media_assets_size_bytes_check check (size_bytes > 0 and size_bytes <= 8388608),
  constraint media_assets_width_check check (width is null or width > 0),
  constraint media_assets_height_check check (height is null or height > 0),
  constraint media_assets_version_check check (version > 0),
  constraint media_assets_replacement_check check (replaced_by_asset_id is distinct from id),
  constraint media_assets_kind_bucket_check check (
    (kind = 'SPONSORSHIP_CREATIVE' and bucket_name = 'sponsorship-media')
    or
    (kind <> 'SPONSORSHIP_CREATIVE' and bucket_name = 'profile-media')
  )
);

create unique index media_assets_bucket_path_uidx
  on public.media_assets (bucket_name, object_path);
create index media_assets_owner_status_idx
  on public.media_assets (owner_account_id, status, kind)
  where archived_at is null;

create table public.creator_profiles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete restrict,
  legal_name varchar(160) not null,
  display_name varchar(120) not null,
  whatsapp_e164 varchar(20),
  bio varchar(2000),
  creator_type public.creator_type not null,
  city varchar(120),
  state char(2),
  avatar_asset_id uuid references public.media_assets(id) on delete restrict,
  cover_asset_id uuid references public.media_assets(id) on delete restrict,
  is_featured boolean not null default false,
  feature_order integer,
  search_document text generated always as (
    public.normalize_search_text(
      coalesce(display_name, '') || ' ' ||
      coalesce(legal_name, '') || ' ' ||
      coalesce(city, '') || ' ' ||
      coalesce(state, '') || ' ' ||
      coalesce(bio, '')
    )
  ) stored,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint creator_profiles_legal_name_check
    check (length(trim(legal_name)) between 2 and 160),
  constraint creator_profiles_display_name_check
    check (length(trim(display_name)) between 2 and 120),
  constraint creator_profiles_state_check
    check (state is null or state ~ '^[A-Z]{2}$'),
  constraint creator_profiles_feature_order_check
    check (feature_order is null or feature_order >= 0),
  constraint creator_profiles_version_check check (version > 0),
  constraint creator_profiles_feature_check
    check (not is_featured or feature_order is not null)
);

create unique index creator_profiles_account_id_uidx
  on public.creator_profiles (account_id);
create index creator_profiles_catalog_idx
  on public.creator_profiles (creator_type, state, city, id)
  where archived_at is null;
create index creator_profiles_feature_idx
  on public.creator_profiles (feature_order, id)
  where archived_at is null and is_featured;
create index creator_profiles_search_trgm_idx
  on public.creator_profiles using gin (search_document extensions.gin_trgm_ops);

create table public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete restrict,
  legal_name varchar(200) not null,
  trade_name varchar(160) not null,
  cnpj char(14) not null,
  employee_range varchar(40),
  segment varchar(120),
  whatsapp_e164 varchar(20),
  description varchar(3000),
  website_url text,
  logo_asset_id uuid references public.media_assets(id) on delete restrict,
  cover_asset_id uuid references public.media_assets(id) on delete restrict,
  is_featured boolean not null default false,
  feature_order integer,
  search_document text generated always as (
    public.normalize_search_text(
      coalesce(trade_name, '') || ' ' ||
      coalesce(legal_name, '') || ' ' ||
      coalesce(segment, '') || ' ' ||
      coalesce(description, '')
    )
  ) stored,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint company_profiles_legal_name_check
    check (length(trim(legal_name)) between 2 and 200),
  constraint company_profiles_trade_name_check
    check (length(trim(trade_name)) between 2 and 160),
  constraint company_profiles_cnpj_check check (cnpj ~ '^[0-9]{14}$'),
  constraint company_profiles_website_url_check
    check (website_url is null or website_url ~* '^https?://'),
  constraint company_profiles_feature_order_check
    check (feature_order is null or feature_order >= 0),
  constraint company_profiles_version_check check (version > 0),
  constraint company_profiles_feature_check
    check (not is_featured or feature_order is not null)
);

create unique index company_profiles_account_id_uidx
  on public.company_profiles (account_id);
create unique index company_profiles_cnpj_uidx
  on public.company_profiles (cnpj);
create index company_profiles_feature_idx
  on public.company_profiles (feature_order, id)
  where archived_at is null and is_featured;
create index company_profiles_search_trgm_idx
  on public.company_profiles using gin (search_document extensions.gin_trgm_ops);

create table public.company_locations (
  id uuid primary key default gen_random_uuid(),
  company_profile_id uuid not null references public.company_profiles(id) on delete restrict,
  label varchar(80) not null,
  postal_code char(8),
  street varchar(180) not null,
  number varchar(30) not null,
  complement varchar(120),
  neighborhood varchar(120),
  city varchar(120) not null,
  state char(2) not null,
  is_primary boolean not null default false,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint company_locations_label_check
    check (length(trim(label)) between 2 and 80),
  constraint company_locations_postal_code_check
    check (postal_code is null or postal_code ~ '^[0-9]{8}$'),
  constraint company_locations_state_check check (state ~ '^[A-Z]{2}$'),
  constraint company_locations_version_check check (version > 0)
);

create unique index company_locations_one_primary_uidx
  on public.company_locations (company_profile_id)
  where is_primary and archived_at is null;
create index company_locations_company_idx
  on public.company_locations (company_profile_id, is_primary, id)
  where archived_at is null;
create index company_locations_catalog_idx
  on public.company_locations (state, city, company_profile_id)
  where archived_at is null;

create table public.niches (
  id uuid primary key default gen_random_uuid(),
  slug varchar(80) not null,
  name varchar(120) not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint niches_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint niches_name_check check (length(trim(name)) between 2 and 120),
  constraint niches_sort_order_check check (sort_order >= 0)
);

create unique index niches_slug_uidx on public.niches (slug);
create index niches_active_order_idx
  on public.niches (sort_order, name, id)
  where is_active;

create table public.creator_niches (
  creator_profile_id uuid not null references public.creator_profiles(id) on delete restrict,
  niche_id uuid not null references public.niches(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (creator_profile_id, niche_id)
);

create index creator_niches_niche_creator_idx
  on public.creator_niches (niche_id, creator_profile_id);

create table public.social_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_account_id uuid not null references public.accounts(id) on delete restrict,
  platform public.social_platform not null,
  handle varchar(160),
  normalized_url text not null,
  is_visible_in_catalog boolean not null default true,
  sort_order integer not null default 0,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint social_profiles_url_check check (normalized_url ~* '^https?://'),
  constraint social_profiles_sort_order_check check (sort_order >= 0),
  constraint social_profiles_version_check check (version > 0)
);

create unique index social_profiles_owner_platform_url_uidx
  on public.social_profiles (owner_account_id, platform, normalized_url)
  where archived_at is null;
create index social_profiles_owner_order_idx
  on public.social_profiles (owner_account_id, sort_order, id)
  where archived_at is null;
create index social_profiles_platform_idx
  on public.social_profiles (platform, owner_account_id)
  where archived_at is null and is_visible_in_catalog;

create table public.creator_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  creator_profile_id uuid not null references public.creator_profiles(id) on delete restrict,
  social_profile_id uuid references public.social_profiles(id) on delete restrict,
  platform public.social_platform not null,
  follower_count bigint,
  engagement_rate numeric(7, 4),
  observed_on date not null,
  source public.creator_metric_source not null default 'SELF_REPORTED',
  created_at timestamptz not null default now(),
  constraint creator_metric_snapshots_follower_count_check
    check (follower_count is null or follower_count >= 0),
  constraint creator_metric_snapshots_engagement_rate_check
    check (engagement_rate is null or engagement_rate between 0 and 100)
);

create unique index creator_metric_snapshots_identity_uidx
  on public.creator_metric_snapshots (
    creator_profile_id,
    platform,
    observed_on,
    coalesce(social_profile_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
create index creator_metric_snapshots_latest_idx
  on public.creator_metric_snapshots (
    creator_profile_id,
    platform,
    observed_on desc,
    created_at desc
  );

create table public.moderation_cases (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete restrict,
  current_submission_sequence integer not null default 0,
  assigned_admin_account_id uuid references public.accounts(id) on delete restrict,
  submitted_at timestamptz,
  resolved_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint moderation_cases_submission_sequence_check
    check (current_submission_sequence >= 0),
  constraint moderation_cases_version_check check (version > 0),
  constraint moderation_cases_assignment_check
    check (assigned_admin_account_id is distinct from account_id)
);

create unique index moderation_cases_account_id_uidx
  on public.moderation_cases (account_id);
create index moderation_cases_queue_idx
  on public.moderation_cases (submitted_at, id)
  where resolved_at is null and archived_at is null;
create index moderation_cases_assignee_idx
  on public.moderation_cases (assigned_admin_account_id, submitted_at, id)
  where resolved_at is null and archived_at is null;

create table public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  moderation_case_id uuid not null references public.moderation_cases(id) on delete restrict,
  submission_sequence integer not null,
  from_status public.account_status not null,
  to_status public.account_status not null,
  action public.moderation_action not null,
  reason text,
  actor_account_id uuid references public.accounts(id) on delete restrict,
  idempotency_key varchar(160) not null,
  occurred_at timestamptz not null default now(),
  constraint moderation_events_submission_sequence_check
    check (submission_sequence > 0),
  constraint moderation_events_transition_check
    check (from_status <> to_status),
  constraint moderation_events_reason_check
    check (
      action not in ('REQUEST_CHANGES', 'SUSPEND', 'BAN', 'UNBAN', 'ARCHIVE')
      or length(trim(reason)) >= 3
    )
);

create unique index moderation_events_idempotency_key_uidx
  on public.moderation_events (idempotency_key);
create unique index moderation_events_case_sequence_action_uidx
  on public.moderation_events (moderation_case_id, submission_sequence, action);
create index moderation_events_case_timeline_idx
  on public.moderation_events (moderation_case_id, occurred_at desc, id);

create or replace function public.reject_immutable_history_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = format('%s is append-only', tg_table_name);
end;
$$;

create trigger moderation_events_immutable_trigger
before update or delete on public.moderation_events
for each row execute function public.reject_immutable_history_mutation();

create table public.sponsorship_placements (
  id uuid primary key default gen_random_uuid(),
  placement_type public.placement_type not null,
  audience public.placement_audience not null default 'ALL',
  slot_key varchar(100) not null,
  advertiser_account_id uuid references public.accounts(id) on delete restrict,
  advertiser_label varchar(160),
  featured_creator_profile_id uuid references public.creator_profiles(id) on delete restrict,
  creative_asset_id uuid references public.media_assets(id) on delete restrict,
  title varchar(160),
  body varchar(500),
  link_url text,
  link_label varchar(80),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default false,
  sort_order integer not null default 0,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint sponsorship_placements_slot_key_check
    check (slot_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint sponsorship_placements_link_url_check
    check (link_url is null or link_url ~* '^https?://'),
  constraint sponsorship_placements_schedule_check
    check (starts_at is null or ends_at is null or ends_at > starts_at),
  constraint sponsorship_placements_sort_order_check check (sort_order >= 0),
  constraint sponsorship_placements_version_check check (version > 0),
  constraint sponsorship_placements_featured_creator_check check (
    placement_type <> 'FEATURED_CREATOR'
    or featured_creator_profile_id is not null
  )
);

create index sponsorship_placements_schedule_idx
  on public.sponsorship_placements (
    audience,
    slot_key,
    starts_at,
    ends_at,
    sort_order,
    id
  )
  where is_active and archived_at is null;
create index sponsorship_placements_advertiser_idx
  on public.sponsorship_placements (advertiser_account_id, id)
  where archived_at is null;

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete restrict,
  template public.email_template not null,
  recipient_email varchar(320) not null,
  payload jsonb not null default '{}'::jsonb,
  status public.email_outbox_status not null default 'PENDING',
  idempotency_key varchar(200) not null,
  due_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by varchar(120),
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  last_error_category varchar(80),
  last_error_code varchar(80),
  sent_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_outbox_recipient_email_check
    check (length(trim(recipient_email)) between 3 and 320),
  constraint email_outbox_payload_check
    check (jsonb_typeof(payload) = 'object'),
  constraint email_outbox_attempt_count_check check (attempt_count >= 0),
  constraint email_outbox_max_attempts_check check (max_attempts between 1 and 20),
  constraint email_outbox_version_check check (version > 0)
);

create unique index email_outbox_idempotency_key_uidx
  on public.email_outbox (idempotency_key);
create index email_outbox_due_idx
  on public.email_outbox (status, due_at, id)
  where status in ('PENDING', 'FAILED');
create index email_outbox_lock_idx
  on public.email_outbox (locked_at, id)
  where locked_at is not null;

create table public.email_attempts (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid not null references public.email_outbox(id) on delete restrict,
  attempt_number integer not null,
  status public.email_attempt_status not null,
  provider_message_id_hash char(64),
  response_code varchar(40),
  error_category varchar(80),
  error_code varchar(80),
  latency_ms integer,
  attempted_at timestamptz not null default now(),
  constraint email_attempts_attempt_number_check check (attempt_number > 0),
  constraint email_attempts_latency_check check (latency_ms is null or latency_ms >= 0)
);

create unique index email_attempts_outbox_number_uidx
  on public.email_attempts (outbox_id, attempt_number);
create index email_attempts_outbox_timeline_idx
  on public.email_attempts (outbox_id, attempted_at desc, id);

create table public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  document_type public.legal_document_type not null,
  version_label varchar(40) not null,
  content_hash char(64) not null,
  document_url text,
  published_at timestamptz not null,
  active_from timestamptz not null,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  constraint legal_documents_version_label_check
    check (length(trim(version_label)) between 1 and 40),
  constraint legal_documents_content_hash_check
    check (content_hash ~ '^[a-f0-9]{64}$'),
  constraint legal_documents_url_check
    check (document_url is null or document_url ~* '^https?://'),
  constraint legal_documents_period_check
    check (retired_at is null or retired_at > active_from)
);

create unique index legal_documents_type_version_uidx
  on public.legal_documents (document_type, version_label);
create index legal_documents_active_idx
  on public.legal_documents (document_type, active_from desc, id)
  where retired_at is null;

create table public.account_consents (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete restrict,
  legal_document_id uuid not null references public.legal_documents(id) on delete restrict,
  accepted_at timestamptz not null default now(),
  request_id varchar(128),
  network_key_hash char(64),
  user_agent_hash char(64),
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint account_consents_context_check check (jsonb_typeof(context) = 'object'),
  constraint account_consents_network_hash_check
    check (network_key_hash is null or network_key_hash ~ '^[a-f0-9]{64}$'),
  constraint account_consents_user_agent_hash_check
    check (user_agent_hash is null or user_agent_hash ~ '^[a-f0-9]{64}$')
);

create unique index account_consents_account_document_uidx
  on public.account_consents (account_id, legal_document_id);
create index account_consents_account_timeline_idx
  on public.account_consents (account_id, accepted_at desc, id);

create table public.account_contact_preferences (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete restrict,
  consent_document_id uuid not null references public.legal_documents(id) on delete restrict,
  email_visible_to_approved_companies boolean not null default false,
  whatsapp_visible_to_approved_companies boolean not null default false,
  social_visible_to_approved_companies boolean not null default true,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint account_contact_preferences_version_check check (version > 0)
);

create unique index account_contact_preferences_account_active_uidx
  on public.account_contact_preferences (account_id)
  where archived_at is null;

create table public.blocked_identities (
  id uuid primary key default gen_random_uuid(),
  provider public.identity_provider not null,
  identity_key_hash char(64) not null,
  provider_subject_hash char(64),
  originating_account_id uuid references public.accounts(id) on delete restrict,
  reason text not null,
  blocked_by_account_id uuid not null references public.accounts(id) on delete restrict,
  blocked_at timestamptz not null default now(),
  unblocked_by_account_id uuid references public.accounts(id) on delete restrict,
  unblocked_at timestamptz,
  unblock_reason text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint blocked_identities_identity_hash_check
    check (identity_key_hash ~ '^[a-f0-9]{64}$'),
  constraint blocked_identities_subject_hash_check
    check (provider_subject_hash is null or provider_subject_hash ~ '^[a-f0-9]{64}$'),
  constraint blocked_identities_reason_check check (length(trim(reason)) >= 3),
  constraint blocked_identities_unblock_check check (
    (unblocked_at is null and unblocked_by_account_id is null and unblock_reason is null)
    or
    (
      unblocked_at is not null
      and unblocked_by_account_id is not null
      and length(trim(unblock_reason)) >= 3
    )
  ),
  constraint blocked_identities_version_check check (version > 0)
);

create unique index blocked_identities_active_identity_uidx
  on public.blocked_identities (provider, identity_key_hash)
  where unblocked_at is null and archived_at is null;
create index blocked_identities_originating_account_idx
  on public.blocked_identities (originating_account_id, blocked_at desc, id);

create table public.audit_revisions (
  revision bigint generated always as identity primary key,
  entity_table varchar(100) not null,
  entity_id text not null,
  operation public.audit_operation not null,
  actor_account_id uuid references public.accounts(id) on delete restrict,
  actor_type public.audit_actor_type not null,
  actor_role public.account_role,
  source public.audit_source not null,
  request_id varchar(128),
  reason text,
  changed_fields text[] not null default '{}'::text[],
  before_state jsonb,
  after_state jsonb,
  occurred_at timestamptz not null default now(),
  constraint audit_revisions_entity_table_check
    check (entity_table ~ '^[a-z][a-z0-9_]{0,99}$'),
  constraint audit_revisions_entity_id_check check (length(trim(entity_id)) > 0),
  constraint audit_revisions_before_state_check
    check (before_state is null or jsonb_typeof(before_state) = 'object'),
  constraint audit_revisions_after_state_check
    check (after_state is null or jsonb_typeof(after_state) = 'object')
);

create index audit_revisions_entity_timeline_idx
  on public.audit_revisions (entity_table, entity_id, occurred_at desc, revision desc);
create index audit_revisions_actor_timeline_idx
  on public.audit_revisions (actor_account_id, occurred_at desc, revision desc)
  where actor_account_id is not null;
create index audit_revisions_operation_timeline_idx
  on public.audit_revisions (operation, occurred_at desc, revision desc);
create index audit_revisions_request_idx
  on public.audit_revisions (request_id)
  where request_id is not null;

create or replace function public.enforce_profile_account_role()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  linked_role public.account_role;
begin
  select role
  into linked_role
  from public.accounts
  where id = new.account_id
    and archived_at is null;

  if linked_role is distinct from tg_argv[0]::public.account_role then
    raise exception using
      errcode = '23514',
      message = format(
        'Profile account role must be %s',
        tg_argv[0]
      );
  end if;

  return new;
end;
$$;

create trigger creator_profiles_account_role_trigger
before insert or update of account_id
on public.creator_profiles
for each row execute function public.enforce_profile_account_role('INFLUENCER');

create trigger company_profiles_account_role_trigger
before insert or update of account_id
on public.company_profiles
for each row execute function public.enforce_profile_account_role('COMPANY');

create or replace function public.set_updated_at_and_version()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  new.version = old.version + 1;
  return new;
end;
$$;

create trigger accounts_updated_at_version_trigger
before update on public.accounts
for each row execute function public.set_updated_at_and_version();

create trigger media_assets_updated_at_version_trigger
before update on public.media_assets
for each row execute function public.set_updated_at_and_version();

create trigger creator_profiles_updated_at_version_trigger
before update on public.creator_profiles
for each row execute function public.set_updated_at_and_version();

create trigger company_profiles_updated_at_version_trigger
before update on public.company_profiles
for each row execute function public.set_updated_at_and_version();

create trigger company_locations_updated_at_version_trigger
before update on public.company_locations
for each row execute function public.set_updated_at_and_version();

create trigger social_profiles_updated_at_version_trigger
before update on public.social_profiles
for each row execute function public.set_updated_at_and_version();

create trigger moderation_cases_updated_at_version_trigger
before update on public.moderation_cases
for each row execute function public.set_updated_at_and_version();

create trigger sponsorship_placements_updated_at_version_trigger
before update on public.sponsorship_placements
for each row execute function public.set_updated_at_and_version();

create trigger email_outbox_updated_at_version_trigger
before update on public.email_outbox
for each row execute function public.set_updated_at_and_version();

create trigger account_contact_preferences_updated_at_version_trigger
before update on public.account_contact_preferences
for each row execute function public.set_updated_at_and_version();

create trigger blocked_identities_updated_at_version_trigger
before update on public.blocked_identities
for each row execute function public.set_updated_at_and_version();

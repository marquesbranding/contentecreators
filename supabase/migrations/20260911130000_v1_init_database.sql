-- Contente Creators — V1 initial database.
--
-- Consolidates the 31 migrations applied from 2026-07-23 to 2026-09-11 into a
-- single baseline, taken right after the hosted databases were reset for launch.
-- It was generated from a database built by those migrations alone (no seed) and
-- verified to reproduce it exactly: public schema, policies in every schema,
-- relation/function/column ACLs, default privileges, roles, extensions, Storage
-- buckets and reference data.
--
-- Sections:
--   0. Extensions, the application role and default privileges
--   1. Public schema (tables, types, functions, triggers, RLS, grants)
--   2. Storage buckets and object policies
--   3. Reference data (niches, legal documents)

-- ---------------------------------------------------------------------------
-- 0. Extensions, application role and default privileges
-- ---------------------------------------------------------------------------

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

do $$
begin
  if not exists (
    select 1
    from pg_roles
    where rolname = 'contente_app_user'
  ) then
    create role contente_app_user nologin noinherit nosuperuser nocreatedb nocreaterole noreplication;
  end if;
end;
$$;

grant contente_app_user to postgres;
grant usage on schema extensions to contente_app_user, supabase_auth_admin;

-- Supabase grants anon, authenticated and service_role privileges on every new
-- object. The access model below is explicit, so those automatic grants are
-- withheld while the schema is created; the default privileges section at the
-- end of part 1 restores the platform defaults for objects created later.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1. Public schema
-- ---------------------------------------------------------------------------

--
-- PostgreSQL database dump
--



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--




--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--



--
-- Name: account_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.account_role AS ENUM (
    'ADMIN',
    'INFLUENCER',
    'COMPANY'
);


ALTER TYPE public.account_role OWNER TO postgres;

--
-- Name: account_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.account_status AS ENUM (
    'ONBOARDING',
    'PENDING_REVIEW',
    'CHANGES_REQUESTED',
    'APPROVED',
    'SUSPENDED',
    'BANNED'
);


ALTER TYPE public.account_status OWNER TO postgres;

--
-- Name: audit_actor_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.audit_actor_type AS ENUM (
    'USER',
    'ADMIN',
    'SYSTEM',
    'SYSTEM_UNKNOWN'
);


ALTER TYPE public.audit_actor_type OWNER TO postgres;

--
-- Name: audit_operation; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.audit_operation AS ENUM (
    'INSERT',
    'UPDATE',
    'ARCHIVE',
    'RESTORE',
    'DELETE',
    'PRIVILEGED_READ'
);


ALTER TYPE public.audit_operation OWNER TO postgres;

--
-- Name: audit_source; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.audit_source AS ENUM (
    'APPLICATION',
    'BACKOFFICE',
    'AUTH_HOOK',
    'CRON',
    'SCRIPT',
    'DATABASE'
);


ALTER TYPE public.audit_source OWNER TO postgres;

--
-- Name: creator_metric_source; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.creator_metric_source AS ENUM (
    'SELF_REPORTED'
);


ALTER TYPE public.creator_metric_source OWNER TO postgres;

--
-- Name: creator_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.creator_type AS ENUM (
    'INFLUENCER',
    'UGC'
);


ALTER TYPE public.creator_type OWNER TO postgres;

--
-- Name: email_attempt_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.email_attempt_status AS ENUM (
    'SENT',
    'FAILED'
);


ALTER TYPE public.email_attempt_status OWNER TO postgres;

--
-- Name: email_outbox_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.email_outbox_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'SENT',
    'FAILED',
    'DEAD_LETTER'
);


ALTER TYPE public.email_outbox_status OWNER TO postgres;

--
-- Name: email_template; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.email_template AS ENUM (
    'ONBOARDING_RECEIVED',
    'CHANGES_REQUESTED',
    'APPROVED',
    'SUSPENDED',
    'RESTORED',
    'BANNED'
);


ALTER TYPE public.email_template OWNER TO postgres;

--
-- Name: identity_auth_effect_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.identity_auth_effect_status AS ENUM (
    'PENDING',
    'SYNCED',
    'FAILED'
);


ALTER TYPE public.identity_auth_effect_status OWNER TO postgres;

--
-- Name: identity_provider; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.identity_provider AS ENUM (
    'EMAIL',
    'GOOGLE'
);


ALTER TYPE public.identity_provider OWNER TO postgres;

--
-- Name: legal_document_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.legal_document_type AS ENUM (
    'TERMS',
    'PRIVACY',
    'CONTACT_VISIBILITY'
);


ALTER TYPE public.legal_document_type OWNER TO postgres;

--
-- Name: media_kind; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.media_kind AS ENUM (
    'AVATAR',
    'COVER',
    'LOGO',
    'SPONSORSHIP_CREATIVE'
);


ALTER TYPE public.media_kind OWNER TO postgres;

--
-- Name: media_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.media_status AS ENUM (
    'PENDING',
    'ACTIVE',
    'ARCHIVED',
    'REJECTED'
);


ALTER TYPE public.media_status OWNER TO postgres;

--
-- Name: moderation_action; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.moderation_action AS ENUM (
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


ALTER TYPE public.moderation_action OWNER TO postgres;

--
-- Name: placement_audience; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.placement_audience AS ENUM (
    'ALL',
    'INFLUENCER',
    'COMPANY'
);


ALTER TYPE public.placement_audience OWNER TO postgres;

--
-- Name: placement_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.placement_type AS ENUM (
    'TOP_BANNER',
    'INLINE_BANNER',
    'CAROUSEL',
    'FEATURED_CREATOR'
);


ALTER TYPE public.placement_type OWNER TO postgres;

--
-- Name: social_platform; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.social_platform AS ENUM (
    'INSTAGRAM',
    'TIKTOK',
    'YOUTUBE',
    'FACEBOOK',
    'X',
    'LINKEDIN',
    'OTHER',
    'THREADS',
    'TELEGRAM'
);


ALTER TYPE public.social_platform OWNER TO postgres;

--
-- Name: whatsapp_contact_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.whatsapp_contact_status AS ENUM (
    'PENDING',
    'CONFIRMED'
);


ALTER TYPE public.whatsapp_contact_status OWNER TO postgres;

--
-- Name: app_account_is_approved(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_account_is_approved(target_account_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1
    from public.accounts account
    where account.id = target_account_id
      and account.status = 'APPROVED'
      and account.archived_at is null
  );
$$;


ALTER FUNCTION public.app_account_is_approved(target_account_id uuid) OWNER TO postgres;

--
-- Name: app_account_role(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_account_role(target_account_id uuid) RETURNS public.account_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select account.role
  from public.accounts account
  where account.id = target_account_id
    and account.archived_at is null;
$$;


ALTER FUNCTION public.app_account_role(target_account_id uuid) OWNER TO postgres;

--
-- Name: app_apply_admin_moderation(uuid, public.moderation_action, text, integer, integer, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_apply_admin_moderation(target_account_id uuid, transition_action public.moderation_action, transition_reason text, expected_account_version integer, expected_profile_version integer, command_idempotency_key text) RETURNS TABLE(result_kind text, event_id uuid, account_id uuid, auth_user_id uuid, status public.account_status, account_version integer, profile_version integer, auth_effect_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


ALTER FUNCTION public.app_apply_admin_moderation(target_account_id uuid, transition_action public.moderation_action, transition_reason text, expected_account_version integer, expected_profile_version integer, command_idempotency_key text) OWNER TO postgres;

--
-- Name: app_assert_moderation_transition(public.account_status, public.account_status, public.moderation_action, public.account_role, boolean, text, public.account_status); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_assert_moderation_transition(transition_from public.account_status, transition_to public.account_status, transition_action public.moderation_action, trusted_actor_role public.account_role, trusted_actor_is_owner boolean, transition_reason text, last_status_before_ban public.account_status DEFAULT NULL::public.account_status) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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

  if transition_action in (
    'REQUEST_CHANGES',
    'SUSPEND',
    'RESTORE',
    'BAN',
    'UNBAN',
    'ARCHIVE'
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


ALTER FUNCTION public.app_assert_moderation_transition(transition_from public.account_status, transition_to public.account_status, transition_action public.moderation_action, trusted_actor_role public.account_role, trusted_actor_is_owner boolean, transition_reason text, last_status_before_ban public.account_status) OWNER TO postgres;

--
-- Name: app_can_edit_own_profile(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_can_edit_own_profile() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select public.app_context_is_verified()
    and public.app_current_role() in ('INFLUENCER', 'COMPANY')
    and public.app_current_status() in (
      'ONBOARDING',
      'CHANGES_REQUESTED',
      'APPROVED'
    );
$$;


ALTER FUNCTION public.app_can_edit_own_profile() OWNER TO postgres;

--
-- Name: app_company_profile_is_owned(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_company_profile_is_owned(target_profile_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1
    from public.company_profiles profile
    where profile.id = target_profile_id
      and profile.account_id = public.app_current_account_id()
  );
$$;


ALTER FUNCTION public.app_company_profile_is_owned(target_profile_id uuid) OWNER TO postgres;

--
-- Name: app_complete_identity_auth_effect(uuid, boolean, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_complete_identity_auth_effect(target_effect_id uuid, sync_succeeded boolean, sync_error_category text DEFAULT NULL::text) RETURNS TABLE(effect_status public.identity_auth_effect_status, attempt_count integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


ALTER FUNCTION public.app_complete_identity_auth_effect(target_effect_id uuid, sync_succeeded boolean, sync_error_category text) OWNER TO postgres;

--
-- Name: app_confirm_whatsapp_contact(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_confirm_whatsapp_contact(confirmation_id uuid) RETURNS TABLE(creator_profile_id uuid, whatsapp_contact_count integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  caller_account_id uuid := public.app_current_account_id();
  current_confirmation public.whatsapp_contact_confirmations%rowtype;
  updated_count integer;
begin
  select confirmation.*
  into current_confirmation
  from public.whatsapp_contact_confirmations confirmation
  where confirmation.id = confirmation_id
  for update;

  if current_confirmation.id is null
    or current_confirmation.company_account_id <> caller_account_id
  then
    raise exception using
      errcode = '23503',
      message = 'whatsapp_contact_confirmation_not_found';
  end if;

  if current_confirmation.status = 'CONFIRMED' then
    select profile.whatsapp_contact_count
    into updated_count
    from public.creator_profiles profile
    where profile.id = current_confirmation.creator_profile_id;

    return query
      select current_confirmation.creator_profile_id, updated_count;
    return;
  end if;

  update public.whatsapp_contact_confirmations
  set
    status = 'CONFIRMED',
    confirmed_at = now()
  where id = confirmation_id;

  update public.creator_profiles
  set whatsapp_contact_count = creator_profiles.whatsapp_contact_count + 1
  where id = current_confirmation.creator_profile_id
  returning creator_profiles.whatsapp_contact_count into updated_count;

  return query
    select current_confirmation.creator_profile_id, updated_count;
end;
$$;


ALTER FUNCTION public.app_confirm_whatsapp_contact(confirmation_id uuid) OWNER TO postgres;

--
-- Name: app_context_is_verified(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_context_is_verified() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1
    from public.accounts account
    where account.id = public.app_current_account_id()
      and account.auth_user_id = public.app_current_auth_user_id()
      and account.role = public.app_current_role()
      and account.status = public.app_current_status()
      and account.archived_at is null
  );
$$;


ALTER FUNCTION public.app_context_is_verified() OWNER TO postgres;

--
-- Name: app_creator_profile_is_approved(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_creator_profile_is_approved(target_profile_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1
    from public.creator_profiles profile
    join public.accounts account on account.id = profile.account_id
    where profile.id = target_profile_id
      and profile.archived_at is null
      and account.status = 'APPROVED'
      and account.archived_at is null
  );
$$;


ALTER FUNCTION public.app_creator_profile_is_approved(target_profile_id uuid) OWNER TO postgres;

--
-- Name: app_creator_profile_is_owned(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_creator_profile_is_owned(target_profile_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1
    from public.creator_profiles profile
    where profile.id = target_profile_id
      and profile.account_id = public.app_current_account_id()
  );
$$;


ALTER FUNCTION public.app_creator_profile_is_owned(target_profile_id uuid) OWNER TO postgres;

--
-- Name: app_current_account_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_current_account_id() RETURNS uuid
    LANGUAGE plpgsql STABLE
    SET search_path TO ''
    AS $$
declare
  configured_value text;
begin
  configured_value := nullif(
    current_setting('app.jwt.account_id', true),
    ''
  );

  if configured_value is null then
    return null;
  end if;

  return configured_value::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;


ALTER FUNCTION public.app_current_account_id() OWNER TO postgres;

--
-- Name: app_current_auth_user_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_current_auth_user_id() RETURNS uuid
    LANGUAGE plpgsql STABLE
    SET search_path TO ''
    AS $$
declare
  configured_value text;
begin
  configured_value := nullif(
    current_setting('app.jwt.auth_user_id', true),
    ''
  );

  if configured_value is null then
    return null;
  end if;

  return configured_value::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;


ALTER FUNCTION public.app_current_auth_user_id() OWNER TO postgres;

--
-- Name: app_current_role(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_current_role() RETURNS public.account_role
    LANGUAGE plpgsql STABLE
    SET search_path TO ''
    AS $$
declare
  configured_value text;
begin
  configured_value := nullif(
    current_setting('app.jwt.account_role', true),
    ''
  );

  if configured_value is null then
    return null;
  end if;

  return configured_value::public.account_role;
exception
  when invalid_text_representation then
    return null;
end;
$$;


ALTER FUNCTION public.app_current_role() OWNER TO postgres;

--
-- Name: app_current_status(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_current_status() RETURNS public.account_status
    LANGUAGE plpgsql STABLE
    SET search_path TO ''
    AS $$
declare
  configured_value text;
begin
  configured_value := nullif(
    current_setting('app.jwt.account_status', true),
    ''
  );

  if configured_value is null then
    return null;
  end if;

  return configured_value::public.account_status;
exception
  when invalid_text_representation then
    return null;
end;
$$;


ALTER FUNCTION public.app_current_status() OWNER TO postgres;

--
-- Name: app_identity_key_hash(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_identity_key_hash(raw_value text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
    SET search_path TO ''
    AS $$
  select encode(
    extensions.digest(lower(trim(raw_value)), 'sha256'),
    'hex'
  );
$$;


ALTER FUNCTION public.app_identity_key_hash(raw_value text) OWNER TO postgres;

--
-- Name: app_identity_subject_hash(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_identity_subject_hash(raw_value text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
    SET search_path TO ''
    AS $$
  select encode(
    extensions.digest(trim(raw_value), 'sha256'),
    'hex'
  );
$$;


ALTER FUNCTION public.app_identity_subject_hash(raw_value text) OWNER TO postgres;

--
-- Name: app_is_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select public.app_context_is_verified()
    and public.app_current_role() = 'ADMIN'
    and public.app_current_status() = 'APPROVED';
$$;


ALTER FUNCTION public.app_is_admin() OWNER TO postgres;

--
-- Name: app_is_approved_viewer(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_is_approved_viewer() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select public.app_context_is_verified()
    and public.app_current_role() in ('INFLUENCER', 'COMPANY')
    and public.app_current_status() = 'APPROVED';
$$;


ALTER FUNCTION public.app_is_approved_viewer() OWNER TO postgres;

--
-- Name: app_moderation_case_is_owned(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_moderation_case_is_owned(target_case_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1
    from public.moderation_cases moderation_case
    where moderation_case.id = target_case_id
      and moderation_case.account_id = public.app_current_account_id()
  );
$$;


ALTER FUNCTION public.app_moderation_case_is_owned(target_case_id uuid) OWNER TO postgres;

--
-- Name: app_moderation_transition_is_allowed(public.account_status, public.account_status, public.moderation_action); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_moderation_transition_is_allowed(transition_from public.account_status, transition_to public.account_status, transition_action public.moderation_action) RETURNS boolean
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    SET search_path TO ''
    AS $$
  select
    (transition_action = 'SUBMIT'
      and transition_from = 'ONBOARDING'
      and transition_to = 'PENDING_REVIEW')
    or
    (transition_action = 'APPROVE'
      and transition_from = 'PENDING_REVIEW'
      and transition_to = 'APPROVED')
    or
    (transition_action = 'REQUEST_CHANGES'
      and transition_from = 'PENDING_REVIEW'
      and transition_to = 'CHANGES_REQUESTED')
    or
    (transition_action = 'BAN'
      and transition_from in (
        'PENDING_REVIEW',
        'CHANGES_REQUESTED',
        'APPROVED',
        'SUSPENDED'
      )
      and transition_to = 'BANNED')
    or
    (transition_action = 'RESUBMIT'
      and transition_from = 'CHANGES_REQUESTED'
      and transition_to = 'PENDING_REVIEW')
    or
    (transition_action = 'SUSPEND'
      and transition_from = 'APPROVED'
      and transition_to = 'SUSPENDED')
    or
    (transition_action = 'RESTORE'
      and transition_from = 'SUSPENDED'
      and transition_to = 'APPROVED');
$$;


ALTER FUNCTION public.app_moderation_transition_is_allowed(transition_from public.account_status, transition_to public.account_status, transition_action public.moderation_action) OWNER TO postgres;

--
-- Name: app_record_whatsapp_contact_click(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_record_whatsapp_contact_click(target_creator_profile_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  caller_account_id uuid := public.app_current_account_id();
  target_account_role public.account_role;
  target_account_status public.account_status;
  target_archived_at timestamptz;
  confirmation_id uuid;
begin
  if not (
    public.app_current_role() = 'COMPANY'
    and public.app_current_status() = 'APPROVED'
  ) then
    raise exception using
      errcode = '42501',
      message = 'whatsapp_contact_company_required';
  end if;

  select account.role, account.status, profile.archived_at
  into target_account_role, target_account_status, target_archived_at
  from public.creator_profiles profile
  join public.accounts account on account.id = profile.account_id
  where profile.id = target_creator_profile_id;

  if target_account_role is null
    or target_account_role <> 'INFLUENCER'
    or target_account_status <> 'APPROVED'
    or target_archived_at is not null
  then
    raise exception using
      errcode = '23503',
      message = 'whatsapp_contact_creator_not_found';
  end if;

  insert into public.whatsapp_contact_confirmations (
    company_account_id,
    creator_profile_id
  )
  values (
    caller_account_id,
    target_creator_profile_id
  )
  on conflict (company_account_id, creator_profile_id)
    where status = 'PENDING'
    do update set clicked_at = now()
  returning id into confirmation_id;

  return confirmation_id;
end;
$$;


ALTER FUNCTION public.app_record_whatsapp_contact_click(target_creator_profile_id uuid) OWNER TO postgres;

--
-- Name: app_resubmit_moderation(uuid, integer, integer, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_resubmit_moderation(target_account_id uuid, expected_account_version integer, expected_profile_version integer, command_idempotency_key text) RETURNS TABLE(result_kind text, submission_sequence integer, account_version integer, profile_version integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


ALTER FUNCTION public.app_resubmit_moderation(target_account_id uuid, expected_account_version integer, expected_profile_version integer, command_idempotency_key text) OWNER TO postgres;

--
-- Name: app_resubmit_moderation_with_outbox(uuid, integer, integer, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_resubmit_moderation_with_outbox(target_account_id uuid, expected_account_version integer, expected_profile_version integer, request_idempotency_key text) RETURNS TABLE(result_kind text, submission_sequence integer, account_version integer, profile_version integer, outbox_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  transition_result record;
  resolved_outbox_id uuid;
begin
  select transition.*
  into transition_result
  from public.app_resubmit_moderation(
    target_account_id,
    expected_account_version,
    expected_profile_version,
    request_idempotency_key
  ) transition;

  if transition_result.result_kind is null then
    raise exception using
      errcode = 'P0001',
      message = 'moderation_resubmission_result_missing';
  end if;

  select item.id
  into resolved_outbox_id
  from public.email_outbox item
  where item.account_id = target_account_id
    and item.idempotency_key = 'onboarding-received:' || request_idempotency_key
  limit 1;

  if transition_result.result_kind = 'APPLIED'
    and resolved_outbox_id is null
  then
    raise exception using
      errcode = 'P0001',
      message = 'moderation_resubmission_outbox_missing';
  end if;

  return query
    select
      transition_result.result_kind::text,
      transition_result.submission_sequence::integer,
      transition_result.account_version::integer,
      transition_result.profile_version::integer,
      resolved_outbox_id;
end;
$$;


ALTER FUNCTION public.app_resubmit_moderation_with_outbox(target_account_id uuid, expected_account_version integer, expected_profile_version integer, request_idempotency_key text) OWNER TO postgres;

--
-- Name: app_set_profile_completion(uuid, public.account_role, smallint, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_set_profile_completion(target_account_id uuid, expected_role public.account_role, calculated_percentage smallint, calculator_version integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  target_role public.account_role;
begin
  if calculated_percentage not between 0 and 100
    or calculator_version <= 0
    or expected_role not in ('INFLUENCER', 'COMPANY')
  then
    raise exception 'invalid profile completion result'
      using errcode = '22023';
  end if;

  select account.role
  into target_role
  from public.accounts account
  where account.id = target_account_id
    and account.archived_at is null
  for update;

  if target_role is null or target_role <> expected_role then
    raise exception 'profile completion account not found'
      using errcode = 'P0002';
  end if;

  if not (
    public.app_is_admin()
    or (
      public.app_context_is_verified()
      and public.app_current_account_id() = target_account_id
      and public.app_current_role() = expected_role
      and public.app_current_status() in (
        'ONBOARDING',
        'CHANGES_REQUESTED',
        'APPROVED'
      )
    )
  ) then
    raise exception 'profile completion update denied'
      using errcode = '42501';
  end if;

  update public.accounts account
  set
    completion_percentage = calculated_percentage,
    completion_version = calculator_version
  where account.id = target_account_id
    and (
      account.completion_percentage is distinct from calculated_percentage
      or account.completion_version is distinct from calculator_version
    );
end;
$$;


ALTER FUNCTION public.app_set_profile_completion(target_account_id uuid, expected_role public.account_role, calculated_percentage smallint, calculator_version integer) OWNER TO postgres;

--
-- Name: app_storage_can_manage_profile_object(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_storage_can_manage_profile_object(object_name text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1
    from public.accounts account
    where account.auth_user_id = auth.uid()
      and account.archived_at is null
      and account.role in (
        'INFLUENCER'::public.account_role,
        'COMPANY'::public.account_role
      )
      and account.status in (
        'ONBOARDING'::public.account_status,
        'CHANGES_REQUESTED'::public.account_status,
        'APPROVED'::public.account_status
      )
      and (storage.foldername(object_name))[1] = account.id::text
  );
$$;


ALTER FUNCTION public.app_storage_can_manage_profile_object(object_name text) OWNER TO postgres;

--
-- Name: app_storage_can_manage_sponsorship_object(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_storage_can_manage_sponsorship_object(object_name text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1
    from public.accounts account
    where account.auth_user_id = auth.uid()
      and account.role = 'ADMIN'::public.account_role
      and account.status = 'APPROVED'::public.account_status
      and account.archived_at is null
      and (storage.foldername(object_name))[1] = account.id::text
  );
$$;


ALTER FUNCTION public.app_storage_can_manage_sponsorship_object(object_name text) OWNER TO postgres;

--
-- Name: app_storage_can_read_profile_object(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_storage_can_read_profile_object(object_name text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  with viewer as (
    select
      account.id,
      account.role,
      account.status
    from public.accounts account
    where account.auth_user_id = auth.uid()
      and account.archived_at is null
  )
  select exists (
    select 1
    from viewer
    where (
      viewer.status in (
        'ONBOARDING'::public.account_status,
        'PENDING_REVIEW'::public.account_status,
        'CHANGES_REQUESTED'::public.account_status,
        'APPROVED'::public.account_status
      )
      and (storage.foldername(object_name))[1] = viewer.id::text
    )
    or (
      viewer.role = 'ADMIN'::public.account_role
      and viewer.status = 'APPROVED'::public.account_status
      and exists (
        select 1
        from public.media_assets media
        where media.bucket_name = 'profile-media'
          and media.object_path = object_name
          and media.archived_at is null
      )
    )
    or (
      viewer.status = 'APPROVED'::public.account_status
      and viewer.role in (
        'INFLUENCER'::public.account_role,
        'COMPANY'::public.account_role
      )
      and exists (
        select 1
        from public.media_assets media
        join public.accounts target_account
          on target_account.id = media.owner_account_id
        where media.bucket_name = 'profile-media'
          and media.object_path = object_name
          and media.status = 'ACTIVE'::public.media_status
          and media.archived_at is null
          and target_account.status = 'APPROVED'::public.account_status
          and target_account.archived_at is null
          and (
            (
              viewer.role = 'COMPANY'::public.account_role
              and target_account.role = 'INFLUENCER'::public.account_role
            )
            or (
              viewer.role = 'INFLUENCER'::public.account_role
              and target_account.id <> viewer.id
              and target_account.role in (
                'INFLUENCER'::public.account_role,
                'COMPANY'::public.account_role
              )
            )
          )
      )
    )
  );
$$;


ALTER FUNCTION public.app_storage_can_read_profile_object(object_name text) OWNER TO postgres;

--
-- Name: app_storage_can_read_sponsorship_object(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.app_storage_can_read_sponsorship_object(object_name text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  with viewer as (
    select
      account.id,
      account.role,
      account.status
    from public.accounts account
    where account.auth_user_id = auth.uid()
      and account.archived_at is null
  )
  select exists (
    select 1
    from viewer
    where (
      viewer.role = 'ADMIN'::public.account_role
      and viewer.status = 'APPROVED'::public.account_status
    )
    or (
      viewer.role in (
        'INFLUENCER'::public.account_role,
        'COMPANY'::public.account_role
      )
      and viewer.status = 'APPROVED'::public.account_status
      and exists (
        select 1
        from public.media_assets media
        join public.sponsorship_placements placement
          on media.id in (
            placement.creative_asset_id,
            placement.creative_asset_tablet_id,
            placement.creative_asset_mobile_id
          )
        where media.bucket_name = 'sponsorship-media'
          and media.object_path = object_name
          and media.status = 'ACTIVE'::public.media_status
          and media.archived_at is null
          and placement.is_active
          and placement.archived_at is null
          and placement.starts_at <= now()
          and (placement.ends_at is null or placement.ends_at > now())
          and (
            placement.audience = 'ALL'::public.placement_audience
            or placement.audience::text = viewer.role::text
          )
      )
    )
  );
$$;


ALTER FUNCTION public.app_storage_can_read_sponsorship_object(object_name text) OWNER TO postgres;

--
-- Name: audit_changed_fields(jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.audit_changed_fields(before_snapshot jsonb, after_snapshot jsonb) RETURNS text[]
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    SET search_path TO ''
    AS $$
  select coalesce(array_agg(keys.key order by keys.key), '{}'::text[])
  from (
    select jsonb_object_keys(coalesce(before_snapshot, '{}'::jsonb)) as key
    union
    select jsonb_object_keys(coalesce(after_snapshot, '{}'::jsonb)) as key
  ) as keys
  where before_snapshot -> keys.key is distinct from after_snapshot -> keys.key;
$$;


ALTER FUNCTION public.audit_changed_fields(before_snapshot jsonb, after_snapshot jsonb) OWNER TO postgres;

--
-- Name: before_user_created(jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.before_user_created(event jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare
  provider_name text := lower(
    coalesce(
      event #>> '{user,app_metadata,provider}',
      'email'
    )
  );
  provider_value public.identity_provider;
  email_value text := nullif(
    lower(trim(event #>> '{user,email}')),
    ''
  );
  email_hash text;
  provider_subject text;
  subject_hash text;
  identity_is_blocked boolean := false;
begin
  provider_value := case provider_name
    when 'email' then 'EMAIL'::public.identity_provider
    when 'google' then 'GOOGLE'::public.identity_provider
    else null
  end;

  if provider_value is null or email_value is null then
    return '{}'::jsonb;
  end if;

  email_hash := public.app_identity_key_hash(email_value);

  if provider_value = 'GOOGLE' then
    provider_subject := coalesce(
      nullif(event #>> '{user,identities,0,provider_id}', ''),
      nullif(event #>> '{user,identities,0,identity_data,sub}', ''),
      nullif(event #>> '{user,user_metadata,sub}', '')
    );

    if provider_subject is not null then
      subject_hash := public.app_identity_subject_hash(provider_subject);
    end if;
  end if;

  select exists (
    select 1
    from public.blocked_identities blocked
    where blocked.provider = provider_value
      and blocked.unblocked_at is null
      and blocked.archived_at is null
      and (
        blocked.identity_key_hash = email_hash
        or (
          provider_value = 'GOOGLE'
          and subject_hash is not null
          and blocked.provider_subject_hash = subject_hash
        )
      )
  )
  into identity_is_blocked;

  if identity_is_blocked then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code',
        403,
        'message',
        'Não foi possível criar esta conta.'
      )
    );
  end if;

  return '{}'::jsonb;
end;
$$;


ALTER FUNCTION public.before_user_created(event jsonb) OWNER TO postgres;

--
-- Name: capture_audit_revision(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.capture_audit_revision() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


ALTER FUNCTION public.capture_audit_revision() OWNER TO postgres;

--
-- Name: consume_rate_limit(text, text, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.consume_rate_limit(target_scope text, target_key_hash text, target_limit integer, target_window_seconds integer) RETURNS TABLE(allowed boolean, remaining integer, retry_after_seconds integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $_$
declare
  evaluated_at timestamptz := clock_timestamp();
  current_bucket public.rate_limit_buckets%rowtype;
begin
  if
    target_scope is null
    or target_scope !~ '^[a-z][a-z0-9_]{1,63}$'
    or target_key_hash !~ '^[a-f0-9]{64}$'
    or target_limit < 1
    or target_limit > 1000
    or target_window_seconds < 1
    or target_window_seconds > 86400
  then
    raise exception 'rate_limit_input_invalid';
  end if;

  insert into public.rate_limit_buckets (
    scope,
    key_hash,
    window_started_at,
    expires_at,
    request_count
  )
  values (
    target_scope,
    target_key_hash,
    evaluated_at,
    evaluated_at + make_interval(secs => target_window_seconds),
    1
  )
  on conflict (scope, key_hash) do nothing
  returning * into current_bucket;

  if found then
    return query
      select true, greatest(target_limit - 1, 0), target_window_seconds;
    return;
  end if;

  select *
  into current_bucket
  from public.rate_limit_buckets
  where scope = target_scope
    and key_hash = target_key_hash
  for update;

  if current_bucket.expires_at <= evaluated_at then
    update public.rate_limit_buckets
    set
      window_started_at = evaluated_at,
      expires_at = evaluated_at + make_interval(secs => target_window_seconds),
      request_count = 1
    where scope = target_scope
      and key_hash = target_key_hash
    returning * into current_bucket;

    return query
      select true, greatest(target_limit - 1, 0), target_window_seconds;
    return;
  end if;

  if current_bucket.request_count >= target_limit then
    return query
      select
        false,
        0,
        greatest(
          ceil(extract(epoch from current_bucket.expires_at - evaluated_at))::integer,
          1
        );
    return;
  end if;

  update public.rate_limit_buckets
  set request_count = request_count + 1
  where scope = target_scope
    and key_hash = target_key_hash
  returning * into current_bucket;

  return query
    select
      true,
      greatest(target_limit - current_bucket.request_count, 0),
      greatest(
        ceil(extract(epoch from current_bucket.expires_at - evaluated_at))::integer,
        1
      );
end;
$_$;


ALTER FUNCTION public.consume_rate_limit(target_scope text, target_key_hash text, target_limit integer, target_window_seconds integer) OWNER TO postgres;

--
-- Name: enforce_profile_account_role(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.enforce_profile_account_role() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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


ALTER FUNCTION public.enforce_profile_account_role() OWNER TO postgres;

--
-- Name: normalize_search_text(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.normalize_search_text(value text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    SET search_path TO ''
    AS $$
  select lower(
    extensions.unaccent(
      'extensions.unaccent'::regdictionary,
      coalesce(value, '')
    )
  );
$$;


ALTER FUNCTION public.normalize_search_text(value text) OWNER TO postgres;

--
-- Name: provision_additional_admin(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.provision_additional_admin(target_auth_user_id uuid, target_email text) RETURNS TABLE(account_id uuid, outcome text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
declare
  normalized_email text := lower(trim(target_email));
  existing_account public.accounts%rowtype;
  provisioned_account_id uuid;
begin
  if not public.app_is_admin() then
    raise exception using
      errcode = '42501',
      message = 'Approved administrator context is required';
  end if;

  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using
      errcode = '22023',
      message = 'Target administrator email is invalid';
  end if;

  if not exists (
    select 1
    from auth.users auth_user
    where auth_user.id = target_auth_user_id
      and lower(auth_user.email) = normalized_email
  ) then
    raise exception using
      errcode = '23503',
      message = 'Target Auth identity does not match the approved email';
  end if;

  select account.*
  into existing_account
  from public.accounts account
  where account.auth_user_id = target_auth_user_id
  for update;

  if found then
    if existing_account.role = 'ADMIN'
      and existing_account.status = 'APPROVED'
      and existing_account.archived_at is null
    then
      return query
      select existing_account.id, 'already_provisioned'::text;
      return;
    end if;

    if existing_account.role is not null
      or existing_account.archived_at is not null
      or existing_account.status in ('SUSPENDED', 'BANNED')
    then
      raise exception using
        errcode = '23514',
        message = 'Target identity already has an incompatible application account';
    end if;

    update public.accounts
    set
      role = 'ADMIN',
      status = 'APPROVED',
      operational_email = normalized_email,
      approved_at = now(),
      submitted_at = coalesce(submitted_at, now()),
      suspended_at = null,
      banned_at = null,
      completion_percentage = 100
    where id = existing_account.id
    returning id into provisioned_account_id;
  else
    insert into public.accounts (
      auth_user_id,
      role,
      status,
      operational_email,
      submitted_at,
      approved_at,
      completion_percentage
    )
    values (
      target_auth_user_id,
      'ADMIN',
      'APPROVED',
      normalized_email,
      now(),
      now(),
      100
    )
    returning id into provisioned_account_id;
  end if;

  return query
  select provisioned_account_id, 'provisioned'::text;
end;
$_$;


ALTER FUNCTION public.provision_additional_admin(target_auth_user_id uuid, target_email text) OWNER TO postgres;

--
-- Name: redact_audit_snapshot(jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.redact_audit_snapshot(snapshot jsonb) RETURNS jsonb
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    SET search_path TO ''
    AS $$
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


ALTER FUNCTION public.redact_audit_snapshot(snapshot jsonb) OWNER TO postgres;

--
-- Name: reject_immutable_history_mutation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.reject_immutable_history_mutation() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  raise exception using
    errcode = '55000',
    message = format('%s is append-only', tg_table_name);
end;
$$;


ALTER FUNCTION public.reject_immutable_history_mutation() OWNER TO postgres;

--
-- Name: set_updated_at_and_version(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at_and_version() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  new.updated_at = now();
  new.version = old.version + 1;
  return new;
end;
$$;


ALTER FUNCTION public.set_updated_at_and_version() OWNER TO postgres;

--
-- Name: validate_moderation_event_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_moderation_event_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  case_owner_account_id uuid;
  case_submission_sequence integer;
  trusted_actor_role public.account_role;
  prior_status public.account_status;
begin
  select
    moderation_case.account_id,
    moderation_case.current_submission_sequence
  into
    case_owner_account_id,
    case_submission_sequence
  from public.moderation_cases moderation_case
  where moderation_case.id = new.moderation_case_id;

  if case_owner_account_id is null then
    raise exception using
      errcode = '23503',
      message = 'moderation_case_not_found';
  end if;

  if new.submission_sequence <> case_submission_sequence then
    raise exception using
      errcode = '40001',
      message = 'moderation_submission_sequence_stale';
  end if;

  select account.role
  into trusted_actor_role
  from public.accounts account
  where account.id = new.actor_account_id
    and account.archived_at is null;

  if trusted_actor_role is null then
    raise exception using
      errcode = '42501',
      message = 'moderation_actor_not_found';
  end if;

  if new.action = 'UNBAN' then
    select event.from_status
    into prior_status
    from public.moderation_events event
    where event.moderation_case_id = new.moderation_case_id
      and event.action = 'BAN'
    order by event.occurred_at desc, event.id desc
    limit 1;
  end if;

  perform public.app_assert_moderation_transition(
    new.from_status,
    new.to_status,
    new.action,
    trusted_actor_role,
    new.actor_account_id = case_owner_account_id,
    new.reason,
    prior_status
  );

  return new;
end;
$$;


ALTER FUNCTION public.validate_moderation_event_insert() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_consents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account_consents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    legal_document_id uuid NOT NULL,
    accepted_at timestamp with time zone DEFAULT now() NOT NULL,
    request_id character varying(128),
    network_key_hash character(64),
    user_agent_hash character(64),
    context jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT account_consents_context_check CHECK ((jsonb_typeof(context) = 'object'::text)),
    CONSTRAINT account_consents_network_hash_check CHECK (((network_key_hash IS NULL) OR (network_key_hash ~ '^[a-f0-9]{64}$'::text))),
    CONSTRAINT account_consents_user_agent_hash_check CHECK (((user_agent_hash IS NULL) OR (user_agent_hash ~ '^[a-f0-9]{64}$'::text)))
);

ALTER TABLE ONLY public.account_consents FORCE ROW LEVEL SECURITY;


ALTER TABLE public.account_consents OWNER TO postgres;

--
-- Name: account_contact_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account_contact_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    consent_document_id uuid NOT NULL,
    email_visible_to_approved_companies boolean DEFAULT false NOT NULL,
    whatsapp_visible_to_approved_companies boolean DEFAULT false NOT NULL,
    social_visible_to_approved_companies boolean DEFAULT false NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone,
    CONSTRAINT account_contact_preferences_version_check CHECK ((version > 0))
);

ALTER TABLE ONLY public.account_contact_preferences FORCE ROW LEVEL SECURITY;


ALTER TABLE public.account_contact_preferences OWNER TO postgres;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auth_user_id uuid NOT NULL,
    role public.account_role,
    status public.account_status DEFAULT 'ONBOARDING'::public.account_status NOT NULL,
    operational_email character varying(320) NOT NULL,
    submitted_at timestamp with time zone,
    approved_at timestamp with time zone,
    suspended_at timestamp with time zone,
    banned_at timestamp with time zone,
    completion_percentage smallint DEFAULT 0 NOT NULL,
    completion_version integer DEFAULT 1 NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone,
    CONSTRAINT accounts_completion_percentage_check CHECK (((completion_percentage >= 0) AND (completion_percentage <= 100))),
    CONSTRAINT accounts_completion_version_check CHECK ((completion_version > 0)),
    CONSTRAINT accounts_operational_email_check CHECK (((length(TRIM(BOTH FROM operational_email)) >= 3) AND (length(TRIM(BOTH FROM operational_email)) <= 320))),
    CONSTRAINT accounts_version_check CHECK ((version > 0))
);

ALTER TABLE ONLY public.accounts FORCE ROW LEVEL SECURITY;


ALTER TABLE public.accounts OWNER TO postgres;

--
-- Name: audit_revisions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_revisions (
    revision bigint NOT NULL,
    entity_table character varying(100) NOT NULL,
    entity_id text NOT NULL,
    operation public.audit_operation NOT NULL,
    actor_account_id uuid,
    actor_type public.audit_actor_type NOT NULL,
    actor_role public.account_role,
    source public.audit_source NOT NULL,
    request_id character varying(128),
    reason text,
    changed_fields text[] DEFAULT '{}'::text[] NOT NULL,
    before_state jsonb,
    after_state jsonb,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_revisions_after_state_check CHECK (((after_state IS NULL) OR (jsonb_typeof(after_state) = 'object'::text))),
    CONSTRAINT audit_revisions_before_state_check CHECK (((before_state IS NULL) OR (jsonb_typeof(before_state) = 'object'::text))),
    CONSTRAINT audit_revisions_entity_id_check CHECK ((length(TRIM(BOTH FROM entity_id)) > 0)),
    CONSTRAINT audit_revisions_entity_table_check CHECK (((entity_table)::text ~ '^[a-z][a-z0-9_]{0,99}$'::text))
);

ALTER TABLE ONLY public.audit_revisions FORCE ROW LEVEL SECURITY;


ALTER TABLE public.audit_revisions OWNER TO postgres;

--
-- Name: audit_revisions_revision_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_revisions ALTER COLUMN revision ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.audit_revisions_revision_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: blocked_identities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blocked_identities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider public.identity_provider NOT NULL,
    identity_key_hash character(64) NOT NULL,
    provider_subject_hash character(64),
    originating_account_id uuid,
    reason text NOT NULL,
    blocked_by_account_id uuid NOT NULL,
    blocked_at timestamp with time zone DEFAULT now() NOT NULL,
    unblocked_by_account_id uuid,
    unblocked_at timestamp with time zone,
    unblock_reason text,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone,
    CONSTRAINT blocked_identities_identity_hash_check CHECK ((identity_key_hash ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT blocked_identities_reason_check CHECK ((length(TRIM(BOTH FROM reason)) >= 3)),
    CONSTRAINT blocked_identities_subject_hash_check CHECK (((provider_subject_hash IS NULL) OR (provider_subject_hash ~ '^[a-f0-9]{64}$'::text))),
    CONSTRAINT blocked_identities_unblock_check CHECK ((((unblocked_at IS NULL) AND (unblocked_by_account_id IS NULL) AND (unblock_reason IS NULL)) OR ((unblocked_at IS NOT NULL) AND (unblocked_by_account_id IS NOT NULL) AND (length(TRIM(BOTH FROM unblock_reason)) >= 3)))),
    CONSTRAINT blocked_identities_version_check CHECK ((version > 0))
);

ALTER TABLE ONLY public.blocked_identities FORCE ROW LEVEL SECURITY;


ALTER TABLE public.blocked_identities OWNER TO postgres;

--
-- Name: company_locations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_profile_id uuid NOT NULL,
    label character varying(80) NOT NULL,
    postal_code character(8),
    street character varying(180) NOT NULL,
    number character varying(30) NOT NULL,
    complement character varying(120),
    neighborhood character varying(120),
    city character varying(120) NOT NULL,
    state character(2) NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone,
    CONSTRAINT company_locations_label_check CHECK (((length(TRIM(BOTH FROM label)) >= 2) AND (length(TRIM(BOTH FROM label)) <= 80))),
    CONSTRAINT company_locations_postal_code_check CHECK (((postal_code IS NULL) OR (postal_code ~ '^[0-9]{8}$'::text))),
    CONSTRAINT company_locations_state_check CHECK ((state ~ '^[A-Z]{2}$'::text)),
    CONSTRAINT company_locations_version_check CHECK ((version > 0))
);

ALTER TABLE ONLY public.company_locations FORCE ROW LEVEL SECURITY;


ALTER TABLE public.company_locations OWNER TO postgres;

--
-- Name: company_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    legal_name character varying(200) NOT NULL,
    trade_name character varying(160) NOT NULL,
    cnpj character(14) NOT NULL,
    employee_range character varying(40),
    segment character varying(120),
    whatsapp_e164 character varying(20),
    description character varying(3000),
    website_url text,
    logo_asset_id uuid,
    cover_asset_id uuid,
    is_featured boolean DEFAULT false NOT NULL,
    feature_order integer,
    search_document text GENERATED ALWAYS AS (public.normalize_search_text((((((((COALESCE(trade_name, ''::character varying))::text || ' '::text) || (COALESCE(legal_name, ''::character varying))::text) || ' '::text) || (COALESCE(segment, ''::character varying))::text) || ' '::text) || (COALESCE(description, ''::character varying))::text))) STORED,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone,
    CONSTRAINT company_profiles_cnpj_check CHECK ((cnpj ~ '^[0-9]{14}$'::text)),
    CONSTRAINT company_profiles_feature_check CHECK (((NOT is_featured) OR (feature_order IS NOT NULL))),
    CONSTRAINT company_profiles_feature_order_check CHECK (((feature_order IS NULL) OR (feature_order >= 0))),
    CONSTRAINT company_profiles_legal_name_check CHECK (((length(TRIM(BOTH FROM legal_name)) >= 2) AND (length(TRIM(BOTH FROM legal_name)) <= 200))),
    CONSTRAINT company_profiles_trade_name_check CHECK (((length(TRIM(BOTH FROM trade_name)) >= 2) AND (length(TRIM(BOTH FROM trade_name)) <= 160))),
    CONSTRAINT company_profiles_version_check CHECK ((version > 0)),
    CONSTRAINT company_profiles_website_url_check CHECK (((website_url IS NULL) OR (website_url ~* '^https?://'::text)))
);

ALTER TABLE ONLY public.company_profiles FORCE ROW LEVEL SECURITY;


ALTER TABLE public.company_profiles OWNER TO postgres;

--
-- Name: creator_metric_snapshots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.creator_metric_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_profile_id uuid NOT NULL,
    social_profile_id uuid,
    platform public.social_platform NOT NULL,
    follower_count bigint,
    engagement_rate numeric(7,4),
    observed_on date NOT NULL,
    source public.creator_metric_source DEFAULT 'SELF_REPORTED'::public.creator_metric_source NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    view_count bigint,
    interaction_count bigint,
    new_follower_count bigint,
    shared_content_description text,
    CONSTRAINT creator_metric_snapshots_engagement_rate_check CHECK (((engagement_rate IS NULL) OR ((engagement_rate >= (0)::numeric) AND (engagement_rate <= (100)::numeric)))),
    CONSTRAINT creator_metric_snapshots_follower_count_check CHECK (((follower_count IS NULL) OR (follower_count >= 0))),
    CONSTRAINT creator_metric_snapshots_interaction_count_check CHECK (((interaction_count IS NULL) OR (interaction_count >= 0))),
    CONSTRAINT creator_metric_snapshots_new_follower_count_check CHECK (((new_follower_count IS NULL) OR (new_follower_count >= 0))),
    CONSTRAINT creator_metric_snapshots_view_count_check CHECK (((view_count IS NULL) OR (view_count >= 0)))
);

ALTER TABLE ONLY public.creator_metric_snapshots FORCE ROW LEVEL SECURITY;


ALTER TABLE public.creator_metric_snapshots OWNER TO postgres;

--
-- Name: creator_niches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.creator_niches (
    creator_profile_id uuid NOT NULL,
    niche_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.creator_niches FORCE ROW LEVEL SECURITY;


ALTER TABLE public.creator_niches OWNER TO postgres;

--
-- Name: creator_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.creator_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    legal_name character varying(160) NOT NULL,
    display_name character varying(120) NOT NULL,
    whatsapp_e164 character varying(20),
    bio character varying(2000),
    creator_type public.creator_type NOT NULL,
    city character varying(120),
    state character(2),
    avatar_asset_id uuid,
    cover_asset_id uuid,
    is_featured boolean DEFAULT false NOT NULL,
    feature_order integer,
    search_document text GENERATED ALWAYS AS (public.normalize_search_text((((((((((COALESCE(display_name, ''::character varying))::text || ' '::text) || (COALESCE(legal_name, ''::character varying))::text) || ' '::text) || (COALESCE(city, ''::character varying))::text) || ' '::text) || (COALESCE(state, ''::bpchar))::text) || ' '::text) || (COALESCE(bio, ''::character varying))::text))) STORED,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone,
    whatsapp_contact_count integer DEFAULT 0 NOT NULL,
    CONSTRAINT creator_profiles_display_name_check CHECK (((length(TRIM(BOTH FROM display_name)) >= 2) AND (length(TRIM(BOTH FROM display_name)) <= 120))),
    CONSTRAINT creator_profiles_feature_check CHECK (((NOT is_featured) OR (feature_order IS NOT NULL))),
    CONSTRAINT creator_profiles_feature_order_check CHECK (((feature_order IS NULL) OR (feature_order >= 0))),
    CONSTRAINT creator_profiles_legal_name_check CHECK (((length(TRIM(BOTH FROM legal_name)) >= 2) AND (length(TRIM(BOTH FROM legal_name)) <= 160))),
    CONSTRAINT creator_profiles_state_check CHECK (((state IS NULL) OR (state ~ '^[A-Z]{2}$'::text))),
    CONSTRAINT creator_profiles_version_check CHECK ((version > 0)),
    CONSTRAINT creator_profiles_whatsapp_contact_count_check CHECK ((whatsapp_contact_count >= 0))
);

ALTER TABLE ONLY public.creator_profiles FORCE ROW LEVEL SECURITY;


ALTER TABLE public.creator_profiles OWNER TO postgres;

--
-- Name: email_attempts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    outbox_id uuid NOT NULL,
    attempt_number integer NOT NULL,
    status public.email_attempt_status NOT NULL,
    provider_message_id_hash character(64),
    response_code character varying(40),
    error_category character varying(80),
    error_code character varying(80),
    latency_ms integer,
    attempted_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT email_attempts_attempt_number_check CHECK ((attempt_number > 0)),
    CONSTRAINT email_attempts_latency_check CHECK (((latency_ms IS NULL) OR (latency_ms >= 0)))
);

ALTER TABLE ONLY public.email_attempts FORCE ROW LEVEL SECURITY;


ALTER TABLE public.email_attempts OWNER TO postgres;

--
-- Name: email_outbox; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid,
    template public.email_template NOT NULL,
    recipient_email character varying(320) NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status public.email_outbox_status DEFAULT 'PENDING'::public.email_outbox_status NOT NULL,
    idempotency_key character varying(200) NOT NULL,
    due_at timestamp with time zone DEFAULT now() NOT NULL,
    locked_at timestamp with time zone,
    locked_by character varying(120),
    attempt_count integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 5 NOT NULL,
    last_error_category character varying(80),
    last_error_code character varying(80),
    sent_at timestamp with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT email_outbox_attempt_count_check CHECK ((attempt_count >= 0)),
    CONSTRAINT email_outbox_max_attempts_check CHECK (((max_attempts >= 1) AND (max_attempts <= 20))),
    CONSTRAINT email_outbox_payload_check CHECK ((jsonb_typeof(payload) = 'object'::text)),
    CONSTRAINT email_outbox_recipient_email_check CHECK (((length(TRIM(BOTH FROM recipient_email)) >= 3) AND (length(TRIM(BOTH FROM recipient_email)) <= 320))),
    CONSTRAINT email_outbox_version_check CHECK ((version > 0))
);

ALTER TABLE ONLY public.email_outbox FORCE ROW LEVEL SECURITY;


ALTER TABLE public.email_outbox OWNER TO postgres;

--
-- Name: identity_auth_effects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.identity_auth_effects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    moderation_event_id uuid NOT NULL,
    account_id uuid NOT NULL,
    auth_user_id uuid NOT NULL,
    action public.moderation_action NOT NULL,
    status public.identity_auth_effect_status DEFAULT 'PENDING'::public.identity_auth_effect_status NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    last_error_category character varying(80),
    synced_at timestamp with time zone,
    idempotency_key character varying(200) NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT identity_auth_effects_action_check CHECK ((action = ANY (ARRAY['BAN'::public.moderation_action, 'UNBAN'::public.moderation_action]))),
    CONSTRAINT identity_auth_effects_attempt_count_check CHECK ((attempt_count >= 0)),
    CONSTRAINT identity_auth_effects_state_check CHECK ((((status = 'PENDING'::public.identity_auth_effect_status) AND (synced_at IS NULL) AND (last_error_category IS NULL)) OR ((status = 'FAILED'::public.identity_auth_effect_status) AND (synced_at IS NULL) AND (length(TRIM(BOTH FROM last_error_category)) >= 3)) OR ((status = 'SYNCED'::public.identity_auth_effect_status) AND (synced_at IS NOT NULL) AND (last_error_category IS NULL)))),
    CONSTRAINT identity_auth_effects_version_check CHECK ((version > 0))
);

ALTER TABLE ONLY public.identity_auth_effects FORCE ROW LEVEL SECURITY;


ALTER TABLE public.identity_auth_effects OWNER TO postgres;

--
-- Name: legal_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.legal_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_type public.legal_document_type NOT NULL,
    version_label character varying(40) NOT NULL,
    content_hash character(64) NOT NULL,
    document_url text,
    published_at timestamp with time zone NOT NULL,
    active_from timestamp with time zone NOT NULL,
    retired_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT legal_documents_content_hash_check CHECK ((content_hash ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT legal_documents_period_check CHECK (((retired_at IS NULL) OR (retired_at > active_from))),
    CONSTRAINT legal_documents_url_check CHECK (((document_url IS NULL) OR (document_url ~* '^https?://'::text))),
    CONSTRAINT legal_documents_version_label_check CHECK (((length(TRIM(BOTH FROM version_label)) >= 1) AND (length(TRIM(BOTH FROM version_label)) <= 40)))
);

ALTER TABLE ONLY public.legal_documents FORCE ROW LEVEL SECURITY;


ALTER TABLE public.legal_documents OWNER TO postgres;

--
-- Name: media_assets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.media_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_account_id uuid NOT NULL,
    bucket_name text NOT NULL,
    object_path text NOT NULL,
    kind public.media_kind NOT NULL,
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL,
    width integer,
    height integer,
    status public.media_status DEFAULT 'PENDING'::public.media_status NOT NULL,
    replaced_by_asset_id uuid,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone,
    CONSTRAINT media_assets_bucket_check CHECK ((bucket_name = ANY (ARRAY['profile-media'::text, 'sponsorship-media'::text]))),
    CONSTRAINT media_assets_height_check CHECK (((height IS NULL) OR (height > 0))),
    CONSTRAINT media_assets_kind_bucket_check CHECK ((((kind = 'SPONSORSHIP_CREATIVE'::public.media_kind) AND (bucket_name = 'sponsorship-media'::text)) OR ((kind <> 'SPONSORSHIP_CREATIVE'::public.media_kind) AND (bucket_name = 'profile-media'::text)))),
    CONSTRAINT media_assets_mime_type_check CHECK ((mime_type = ANY (ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text]))),
    CONSTRAINT media_assets_object_path_check CHECK (((object_path !~ '(^/|\\.\\.|//)'::text) AND ((length(object_path) >= 3) AND (length(object_path) <= 1024)))),
    CONSTRAINT media_assets_replacement_check CHECK ((replaced_by_asset_id IS DISTINCT FROM id)),
    CONSTRAINT media_assets_size_bytes_check CHECK (((size_bytes > 0) AND (size_bytes <= 8388608))),
    CONSTRAINT media_assets_version_check CHECK ((version > 0)),
    CONSTRAINT media_assets_width_check CHECK (((width IS NULL) OR (width > 0)))
);

ALTER TABLE ONLY public.media_assets FORCE ROW LEVEL SECURITY;


ALTER TABLE public.media_assets OWNER TO postgres;

--
-- Name: moderation_cases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.moderation_cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    current_submission_sequence integer DEFAULT 0 NOT NULL,
    assigned_admin_account_id uuid,
    submitted_at timestamp with time zone,
    resolved_at timestamp with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone,
    CONSTRAINT moderation_cases_assignment_check CHECK ((assigned_admin_account_id IS DISTINCT FROM account_id)),
    CONSTRAINT moderation_cases_submission_sequence_check CHECK ((current_submission_sequence >= 0)),
    CONSTRAINT moderation_cases_version_check CHECK ((version > 0))
);

ALTER TABLE ONLY public.moderation_cases FORCE ROW LEVEL SECURITY;


ALTER TABLE public.moderation_cases OWNER TO postgres;

--
-- Name: moderation_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.moderation_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    moderation_case_id uuid NOT NULL,
    submission_sequence integer NOT NULL,
    from_status public.account_status NOT NULL,
    to_status public.account_status NOT NULL,
    action public.moderation_action NOT NULL,
    reason text,
    actor_account_id uuid NOT NULL,
    idempotency_key character varying(160) NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT moderation_events_reason_check CHECK (((action <> ALL (ARRAY['REQUEST_CHANGES'::public.moderation_action, 'SUSPEND'::public.moderation_action, 'RESTORE'::public.moderation_action, 'BAN'::public.moderation_action, 'UNBAN'::public.moderation_action, 'ARCHIVE'::public.moderation_action])) OR (length(TRIM(BOTH FROM reason)) >= 3))),
    CONSTRAINT moderation_events_submission_sequence_check CHECK ((submission_sequence > 0)),
    CONSTRAINT moderation_events_transition_check CHECK ((((action = 'ARCHIVE'::public.moderation_action) AND (from_status = to_status)) OR ((action <> 'ARCHIVE'::public.moderation_action) AND (from_status <> to_status))))
);

ALTER TABLE ONLY public.moderation_events FORCE ROW LEVEL SECURITY;


ALTER TABLE public.moderation_events OWNER TO postgres;

--
-- Name: niches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.niches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug character varying(80) NOT NULL,
    name character varying(120) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT niches_name_check CHECK (((length(TRIM(BOTH FROM name)) >= 2) AND (length(TRIM(BOTH FROM name)) <= 120))),
    CONSTRAINT niches_slug_check CHECK (((slug)::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text)),
    CONSTRAINT niches_sort_order_check CHECK ((sort_order >= 0))
);

ALTER TABLE ONLY public.niches FORCE ROW LEVEL SECURITY;


ALTER TABLE public.niches OWNER TO postgres;

--
-- Name: onboarding_drafts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.onboarding_drafts (
    account_id uuid NOT NULL,
    role public.account_role NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT onboarding_drafts_payload_check CHECK (((jsonb_typeof(payload) = 'object'::text) AND (octet_length((payload)::text) <= 50000))),
    CONSTRAINT onboarding_drafts_role_check CHECK ((role = ANY (ARRAY['INFLUENCER'::public.account_role, 'COMPANY'::public.account_role]))),
    CONSTRAINT onboarding_drafts_version_check CHECK ((version > 0))
);

ALTER TABLE ONLY public.onboarding_drafts FORCE ROW LEVEL SECURITY;


ALTER TABLE public.onboarding_drafts OWNER TO postgres;

--
-- Name: rate_limit_buckets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rate_limit_buckets (
    scope character varying(64) NOT NULL,
    key_hash character varying(64) NOT NULL,
    window_started_at timestamp with time zone NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    request_count integer NOT NULL,
    CONSTRAINT rate_limit_buckets_key_hash_format CHECK (((key_hash)::text ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT rate_limit_buckets_request_count_check CHECK ((request_count > 0))
);


ALTER TABLE public.rate_limit_buckets OWNER TO postgres;

--
-- Name: TABLE rate_limit_buckets; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.rate_limit_buckets IS 'Privacy-safe fixed-window counters. key_hash never stores a raw identity, email, IP, CNPJ, or token.';


--
-- Name: social_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.social_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_account_id uuid NOT NULL,
    platform public.social_platform NOT NULL,
    handle character varying(160),
    normalized_url text NOT NULL,
    is_visible_in_catalog boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone,
    is_primary boolean DEFAULT false NOT NULL,
    CONSTRAINT social_profiles_sort_order_check CHECK ((sort_order >= 0)),
    CONSTRAINT social_profiles_url_check CHECK ((normalized_url ~* '^https?://'::text)),
    CONSTRAINT social_profiles_version_check CHECK ((version > 0))
);

ALTER TABLE ONLY public.social_profiles FORCE ROW LEVEL SECURITY;


ALTER TABLE public.social_profiles OWNER TO postgres;

--
-- Name: sponsorship_placements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sponsorship_placements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    placement_type public.placement_type NOT NULL,
    audience public.placement_audience DEFAULT 'ALL'::public.placement_audience NOT NULL,
    slot_key character varying(100) NOT NULL,
    advertiser_account_id uuid,
    advertiser_label character varying(160),
    featured_creator_profile_id uuid,
    creative_asset_id uuid,
    title character varying(160),
    body character varying(500),
    link_url text,
    link_label character varying(80),
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    is_active boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone,
    creative_asset_tablet_id uuid,
    creative_asset_mobile_id uuid,
    CONSTRAINT sponsorship_placements_featured_creator_check CHECK (((placement_type <> 'FEATURED_CREATOR'::public.placement_type) OR (featured_creator_profile_id IS NOT NULL))),
    CONSTRAINT sponsorship_placements_link_url_check CHECK (((link_url IS NULL) OR (link_url ~* '^https?://'::text))),
    CONSTRAINT sponsorship_placements_schedule_check CHECK (((starts_at IS NULL) OR (ends_at IS NULL) OR (ends_at > starts_at))),
    CONSTRAINT sponsorship_placements_slot_key_check CHECK (((slot_key)::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text)),
    CONSTRAINT sponsorship_placements_sort_order_check CHECK ((sort_order >= 0)),
    CONSTRAINT sponsorship_placements_version_check CHECK ((version > 0))
);

ALTER TABLE ONLY public.sponsorship_placements FORCE ROW LEVEL SECURITY;


ALTER TABLE public.sponsorship_placements OWNER TO postgres;

--
-- Name: whatsapp_contact_confirmations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.whatsapp_contact_confirmations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_account_id uuid NOT NULL,
    creator_profile_id uuid NOT NULL,
    status public.whatsapp_contact_status DEFAULT 'PENDING'::public.whatsapp_contact_status NOT NULL,
    clicked_at timestamp with time zone DEFAULT now() NOT NULL,
    confirmed_at timestamp with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT whatsapp_contact_confirmations_state_check CHECK ((((status = 'PENDING'::public.whatsapp_contact_status) AND (confirmed_at IS NULL)) OR ((status = 'CONFIRMED'::public.whatsapp_contact_status) AND (confirmed_at IS NOT NULL)))),
    CONSTRAINT whatsapp_contact_confirmations_version_check CHECK ((version > 0))
);

ALTER TABLE ONLY public.whatsapp_contact_confirmations FORCE ROW LEVEL SECURITY;


ALTER TABLE public.whatsapp_contact_confirmations OWNER TO postgres;

--
-- Name: account_consents account_consents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_consents
    ADD CONSTRAINT account_consents_pkey PRIMARY KEY (id);


--
-- Name: account_contact_preferences account_contact_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_contact_preferences
    ADD CONSTRAINT account_contact_preferences_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: audit_revisions audit_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_revisions
    ADD CONSTRAINT audit_revisions_pkey PRIMARY KEY (revision);


--
-- Name: blocked_identities blocked_identities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocked_identities
    ADD CONSTRAINT blocked_identities_pkey PRIMARY KEY (id);


--
-- Name: company_locations company_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_locations
    ADD CONSTRAINT company_locations_pkey PRIMARY KEY (id);


--
-- Name: company_profiles company_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_profiles
    ADD CONSTRAINT company_profiles_pkey PRIMARY KEY (id);


--
-- Name: creator_metric_snapshots creator_metric_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.creator_metric_snapshots
    ADD CONSTRAINT creator_metric_snapshots_pkey PRIMARY KEY (id);


--
-- Name: creator_niches creator_niches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.creator_niches
    ADD CONSTRAINT creator_niches_pkey PRIMARY KEY (creator_profile_id, niche_id);


--
-- Name: creator_profiles creator_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.creator_profiles
    ADD CONSTRAINT creator_profiles_pkey PRIMARY KEY (id);


--
-- Name: email_attempts email_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_attempts
    ADD CONSTRAINT email_attempts_pkey PRIMARY KEY (id);


--
-- Name: email_outbox email_outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_outbox
    ADD CONSTRAINT email_outbox_pkey PRIMARY KEY (id);


--
-- Name: identity_auth_effects identity_auth_effects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_auth_effects
    ADD CONSTRAINT identity_auth_effects_pkey PRIMARY KEY (id);


--
-- Name: legal_documents legal_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.legal_documents
    ADD CONSTRAINT legal_documents_pkey PRIMARY KEY (id);


--
-- Name: media_assets media_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_pkey PRIMARY KEY (id);


--
-- Name: moderation_cases moderation_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.moderation_cases
    ADD CONSTRAINT moderation_cases_pkey PRIMARY KEY (id);


--
-- Name: moderation_events moderation_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.moderation_events
    ADD CONSTRAINT moderation_events_pkey PRIMARY KEY (id);


--
-- Name: niches niches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.niches
    ADD CONSTRAINT niches_pkey PRIMARY KEY (id);


--
-- Name: onboarding_drafts onboarding_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_drafts
    ADD CONSTRAINT onboarding_drafts_pkey PRIMARY KEY (account_id);


--
-- Name: rate_limit_buckets rate_limit_buckets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rate_limit_buckets
    ADD CONSTRAINT rate_limit_buckets_pkey PRIMARY KEY (scope, key_hash);


--
-- Name: social_profiles social_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.social_profiles
    ADD CONSTRAINT social_profiles_pkey PRIMARY KEY (id);


--
-- Name: sponsorship_placements sponsorship_placements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sponsorship_placements
    ADD CONSTRAINT sponsorship_placements_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_contact_confirmations whatsapp_contact_confirmations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_contact_confirmations
    ADD CONSTRAINT whatsapp_contact_confirmations_pkey PRIMARY KEY (id);


--
-- Name: account_consents_account_document_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX account_consents_account_document_uidx ON public.account_consents USING btree (account_id, legal_document_id);


--
-- Name: account_consents_account_timeline_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX account_consents_account_timeline_idx ON public.account_consents USING btree (account_id, accepted_at DESC, id);


--
-- Name: account_contact_preferences_account_active_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX account_contact_preferences_account_active_uidx ON public.account_contact_preferences USING btree (account_id) WHERE (archived_at IS NULL);


--
-- Name: accounts_auth_user_id_role_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX accounts_auth_user_id_role_uidx ON public.accounts USING btree (auth_user_id, role);


--
-- Name: accounts_moderation_queue_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX accounts_moderation_queue_idx ON public.accounts USING btree (status, submitted_at, id) WHERE ((archived_at IS NULL) AND (status = ANY (ARRAY['PENDING_REVIEW'::public.account_status, 'CHANGES_REQUESTED'::public.account_status])));


--
-- Name: accounts_moderation_role_queue_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX accounts_moderation_role_queue_idx ON public.accounts USING btree (role, status, submitted_at, id) WHERE ((archived_at IS NULL) AND (status = ANY (ARRAY['PENDING_REVIEW'::public.account_status, 'CHANGES_REQUESTED'::public.account_status])));


--
-- Name: accounts_role_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX accounts_role_status_idx ON public.accounts USING btree (role, status) WHERE (archived_at IS NULL);


--
-- Name: audit_revisions_actor_timeline_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_revisions_actor_timeline_idx ON public.audit_revisions USING btree (actor_account_id, occurred_at DESC, revision DESC) WHERE (actor_account_id IS NOT NULL);


--
-- Name: audit_revisions_entity_period_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_revisions_entity_period_idx ON public.audit_revisions USING btree (entity_table, occurred_at DESC, revision DESC);


--
-- Name: audit_revisions_entity_timeline_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_revisions_entity_timeline_idx ON public.audit_revisions USING btree (entity_table, entity_id, occurred_at DESC, revision DESC);


--
-- Name: audit_revisions_operation_timeline_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_revisions_operation_timeline_idx ON public.audit_revisions USING btree (operation, occurred_at DESC, revision DESC);


--
-- Name: audit_revisions_request_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_revisions_request_idx ON public.audit_revisions USING btree (request_id) WHERE (request_id IS NOT NULL);


--
-- Name: audit_revisions_source_timeline_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_revisions_source_timeline_idx ON public.audit_revisions USING btree (source, occurred_at DESC, revision DESC);


--
-- Name: blocked_identities_active_identity_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX blocked_identities_active_identity_uidx ON public.blocked_identities USING btree (provider, identity_key_hash) WHERE ((unblocked_at IS NULL) AND (archived_at IS NULL));


--
-- Name: blocked_identities_originating_account_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX blocked_identities_originating_account_idx ON public.blocked_identities USING btree (originating_account_id, blocked_at DESC, id);


--
-- Name: company_locations_catalog_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX company_locations_catalog_idx ON public.company_locations USING btree (state, city, company_profile_id) WHERE (archived_at IS NULL);


--
-- Name: company_locations_company_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX company_locations_company_idx ON public.company_locations USING btree (company_profile_id, is_primary, id) WHERE (archived_at IS NULL);


--
-- Name: company_locations_one_primary_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX company_locations_one_primary_uidx ON public.company_locations USING btree (company_profile_id) WHERE (is_primary AND (archived_at IS NULL));


--
-- Name: company_profiles_account_id_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX company_profiles_account_id_uidx ON public.company_profiles USING btree (account_id);


--
-- Name: company_profiles_cnpj_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX company_profiles_cnpj_uidx ON public.company_profiles USING btree (cnpj);


--
-- Name: company_profiles_created_at_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX company_profiles_created_at_active_idx ON public.company_profiles USING btree (created_at, id) WHERE (archived_at IS NULL);


--
-- Name: company_profiles_feature_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX company_profiles_feature_idx ON public.company_profiles USING btree (feature_order, id) WHERE ((archived_at IS NULL) AND is_featured);


--
-- Name: company_profiles_search_trgm_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX company_profiles_search_trgm_idx ON public.company_profiles USING gin (search_document extensions.gin_trgm_ops);


--
-- Name: creator_metric_snapshots_identity_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX creator_metric_snapshots_identity_uidx ON public.creator_metric_snapshots USING btree (creator_profile_id, platform, observed_on, COALESCE(social_profile_id, '00000000-0000-0000-0000-000000000000'::uuid));


--
-- Name: creator_metric_snapshots_latest_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX creator_metric_snapshots_latest_idx ON public.creator_metric_snapshots USING btree (creator_profile_id, platform, observed_on DESC, created_at DESC);


--
-- Name: creator_niches_niche_creator_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX creator_niches_niche_creator_idx ON public.creator_niches USING btree (niche_id, creator_profile_id);


--
-- Name: creator_profiles_account_id_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX creator_profiles_account_id_uidx ON public.creator_profiles USING btree (account_id);


--
-- Name: creator_profiles_catalog_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX creator_profiles_catalog_idx ON public.creator_profiles USING btree (creator_type, state, city, id) WHERE (archived_at IS NULL);


--
-- Name: creator_profiles_created_at_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX creator_profiles_created_at_active_idx ON public.creator_profiles USING btree (created_at, id) WHERE (archived_at IS NULL);


--
-- Name: creator_profiles_display_name_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX creator_profiles_display_name_active_idx ON public.creator_profiles USING btree (display_name, id) WHERE (archived_at IS NULL);


--
-- Name: creator_profiles_feature_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX creator_profiles_feature_idx ON public.creator_profiles USING btree (feature_order, id) WHERE ((archived_at IS NULL) AND is_featured);


--
-- Name: creator_profiles_location_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX creator_profiles_location_active_idx ON public.creator_profiles USING btree (state, city, display_name, id) WHERE (archived_at IS NULL);


--
-- Name: creator_profiles_search_active_trgm_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX creator_profiles_search_active_trgm_idx ON public.creator_profiles USING gin (search_document extensions.gin_trgm_ops) WHERE (archived_at IS NULL);


--
-- Name: creator_profiles_search_trgm_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX creator_profiles_search_trgm_idx ON public.creator_profiles USING gin (search_document extensions.gin_trgm_ops);


--
-- Name: email_attempts_outbox_number_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX email_attempts_outbox_number_uidx ON public.email_attempts USING btree (outbox_id, attempt_number);


--
-- Name: email_attempts_outbox_timeline_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX email_attempts_outbox_timeline_idx ON public.email_attempts USING btree (outbox_id, attempted_at DESC, id);


--
-- Name: email_outbox_due_claim_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX email_outbox_due_claim_idx ON public.email_outbox USING btree (due_at, id) WHERE (status = ANY (ARRAY['PENDING'::public.email_outbox_status, 'FAILED'::public.email_outbox_status]));


--
-- Name: email_outbox_due_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX email_outbox_due_idx ON public.email_outbox USING btree (status, due_at, id) WHERE (status = ANY (ARRAY['PENDING'::public.email_outbox_status, 'FAILED'::public.email_outbox_status]));


--
-- Name: email_outbox_idempotency_key_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX email_outbox_idempotency_key_uidx ON public.email_outbox USING btree (idempotency_key);


--
-- Name: email_outbox_lock_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX email_outbox_lock_idx ON public.email_outbox USING btree (locked_at, id) WHERE (locked_at IS NOT NULL);


--
-- Name: identity_auth_effects_account_timeline_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX identity_auth_effects_account_timeline_idx ON public.identity_auth_effects USING btree (account_id, created_at DESC, id);


--
-- Name: identity_auth_effects_event_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX identity_auth_effects_event_uidx ON public.identity_auth_effects USING btree (moderation_event_id);


--
-- Name: identity_auth_effects_idempotency_key_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX identity_auth_effects_idempotency_key_uidx ON public.identity_auth_effects USING btree (idempotency_key);


--
-- Name: identity_auth_effects_retry_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX identity_auth_effects_retry_idx ON public.identity_auth_effects USING btree (status, updated_at, id) WHERE (status = ANY (ARRAY['PENDING'::public.identity_auth_effect_status, 'FAILED'::public.identity_auth_effect_status]));


--
-- Name: legal_documents_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX legal_documents_active_idx ON public.legal_documents USING btree (document_type, active_from DESC, id) WHERE (retired_at IS NULL);


--
-- Name: legal_documents_type_version_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX legal_documents_type_version_uidx ON public.legal_documents USING btree (document_type, version_label);


--
-- Name: media_assets_bucket_path_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX media_assets_bucket_path_uidx ON public.media_assets USING btree (bucket_name, object_path);


--
-- Name: media_assets_owner_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX media_assets_owner_status_idx ON public.media_assets USING btree (owner_account_id, status, kind) WHERE (archived_at IS NULL);


--
-- Name: moderation_cases_account_id_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX moderation_cases_account_id_uidx ON public.moderation_cases USING btree (account_id);


--
-- Name: moderation_cases_assignee_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX moderation_cases_assignee_idx ON public.moderation_cases USING btree (assigned_admin_account_id, submitted_at, id) WHERE ((resolved_at IS NULL) AND (archived_at IS NULL));


--
-- Name: moderation_cases_queue_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX moderation_cases_queue_idx ON public.moderation_cases USING btree (submitted_at, id) WHERE ((resolved_at IS NULL) AND (archived_at IS NULL));


--
-- Name: moderation_events_case_sequence_action_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX moderation_events_case_sequence_action_idx ON public.moderation_events USING btree (moderation_case_id, submission_sequence, action);


--
-- Name: moderation_events_case_timeline_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX moderation_events_case_timeline_idx ON public.moderation_events USING btree (moderation_case_id, occurred_at DESC, id);


--
-- Name: moderation_events_idempotency_key_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX moderation_events_idempotency_key_uidx ON public.moderation_events USING btree (idempotency_key);


--
-- Name: niches_active_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX niches_active_order_idx ON public.niches USING btree (sort_order, name, id) WHERE is_active;


--
-- Name: niches_slug_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX niches_slug_uidx ON public.niches USING btree (slug);


--
-- Name: onboarding_drafts_updated_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX onboarding_drafts_updated_at_idx ON public.onboarding_drafts USING btree (updated_at, account_id);


--
-- Name: social_profiles_owner_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX social_profiles_owner_order_idx ON public.social_profiles USING btree (owner_account_id, sort_order, id) WHERE (archived_at IS NULL);


--
-- Name: social_profiles_owner_platform_url_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX social_profiles_owner_platform_url_uidx ON public.social_profiles USING btree (owner_account_id, platform, normalized_url) WHERE (archived_at IS NULL);


--
-- Name: social_profiles_owner_primary_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX social_profiles_owner_primary_uidx ON public.social_profiles USING btree (owner_account_id) WHERE ((archived_at IS NULL) AND is_primary);


--
-- Name: social_profiles_platform_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX social_profiles_platform_idx ON public.social_profiles USING btree (platform, owner_account_id) WHERE ((archived_at IS NULL) AND is_visible_in_catalog);


--
-- Name: sponsorship_placements_advertiser_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sponsorship_placements_advertiser_idx ON public.sponsorship_placements USING btree (advertiser_account_id, id) WHERE (archived_at IS NULL);


--
-- Name: sponsorship_placements_delivery_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sponsorship_placements_delivery_idx ON public.sponsorship_placements USING btree (slot_key, audience, sort_order, id, starts_at, ends_at) WHERE (is_active AND (archived_at IS NULL));


--
-- Name: sponsorship_placements_schedule_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sponsorship_placements_schedule_idx ON public.sponsorship_placements USING btree (audience, slot_key, starts_at, ends_at, sort_order, id) WHERE (is_active AND (archived_at IS NULL));


--
-- Name: whatsapp_contact_confirmations_company_queue_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX whatsapp_contact_confirmations_company_queue_idx ON public.whatsapp_contact_confirmations USING btree (company_account_id, status, clicked_at);


--
-- Name: whatsapp_contact_confirmations_pending_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX whatsapp_contact_confirmations_pending_uidx ON public.whatsapp_contact_confirmations USING btree (company_account_id, creator_profile_id) WHERE (status = 'PENDING'::public.whatsapp_contact_status);


--
-- Name: account_consents account_consents_audit_revision_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER account_consents_audit_revision_trigger AFTER INSERT OR DELETE OR UPDATE ON public.account_consents FOR EACH ROW EXECUTE FUNCTION public.capture_audit_revision();


--
-- Name: account_contact_preferences account_contact_preferences_audit_revision_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER account_contact_preferences_audit_revision_trigger AFTER INSERT OR DELETE OR UPDATE ON public.account_contact_preferences FOR EACH ROW EXECUTE FUNCTION public.capture_audit_revision();


--
-- Name: account_contact_preferences account_contact_preferences_updated_at_version_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER account_contact_preferences_updated_at_version_trigger BEFORE UPDATE ON public.account_contact_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_and_version();


--
-- Name: accounts accounts_audit_revision_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER accounts_audit_revision_trigger AFTER INSERT OR DELETE OR UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.capture_audit_revision();


--
-- Name: accounts accounts_updated_at_version_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER accounts_updated_at_version_trigger BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_and_version();


--
-- Name: audit_revisions audit_revisions_immutable_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER audit_revisions_immutable_trigger BEFORE DELETE OR UPDATE ON public.audit_revisions FOR EACH ROW EXECUTE FUNCTION public.reject_immutable_history_mutation();


--
-- Name: blocked_identities blocked_identities_audit_revision_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER blocked_identities_audit_revision_trigger AFTER INSERT OR DELETE OR UPDATE ON public.blocked_identities FOR EACH ROW EXECUTE FUNCTION public.capture_audit_revision();


--
-- Name: blocked_identities blocked_identities_updated_at_version_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER blocked_identities_updated_at_version_trigger BEFORE UPDATE ON public.blocked_identities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_and_version();


--
-- Name: company_locations company_locations_audit_revision_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER company_locations_audit_revision_trigger AFTER INSERT OR DELETE OR UPDATE ON public.company_locations FOR EACH ROW EXECUTE FUNCTION public.capture_audit_revision();


--
-- Name: company_locations company_locations_updated_at_version_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER company_locations_updated_at_version_trigger BEFORE UPDATE ON public.company_locations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_and_version();


--
-- Name: company_profiles company_profiles_account_role_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER company_profiles_account_role_trigger BEFORE INSERT OR UPDATE OF account_id ON public.company_profiles FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_account_role('COMPANY');


--
-- Name: company_profiles company_profiles_audit_revision_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER company_profiles_audit_revision_trigger AFTER INSERT OR DELETE OR UPDATE ON public.company_profiles FOR EACH ROW EXECUTE FUNCTION public.capture_audit_revision();


--
-- Name: company_profiles company_profiles_updated_at_version_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER company_profiles_updated_at_version_trigger BEFORE UPDATE ON public.company_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_and_version();


--
-- Name: creator_metric_snapshots creator_metric_snapshots_audit_revision_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER creator_metric_snapshots_audit_revision_trigger AFTER INSERT OR DELETE OR UPDATE ON public.creator_metric_snapshots FOR EACH ROW EXECUTE FUNCTION public.capture_audit_revision();


--
-- Name: creator_niches creator_niches_audit_revision_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER creator_niches_audit_revision_trigger AFTER INSERT OR DELETE OR UPDATE ON public.creator_niches FOR EACH ROW EXECUTE FUNCTION public.capture_audit_revision();


--
-- Name: creator_profiles creator_profiles_account_role_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER creator_profiles_account_role_trigger BEFORE INSERT OR UPDATE OF account_id ON public.creator_profiles FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_account_role('INFLUENCER');


--
-- Name: creator_profiles creator_profiles_audit_revision_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER creator_profiles_audit_revision_trigger AFTER INSERT OR DELETE OR UPDATE ON public.creator_profiles FOR EACH ROW EXECUTE FUNCTION public.capture_audit_revision();


--
-- Name: creator_profiles creator_profiles_updated_at_version_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER creator_profiles_updated_at_version_trigger BEFORE UPDATE ON public.creator_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_and_version();


--
-- Name: email_attempts email_attempts_audit_revision_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER email_attempts_audit_revision_trigger AFTER INSERT OR DELETE OR UPDATE ON public.email_attempts FOR EACH ROW EXECUTE FUNCTION public.capture_audit_revision();


--
-- Name: email_outbox email_outbox_audit_revision_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER email_outbox_audit_revision_trigger AFTER INSERT OR DELETE OR UPDATE ON public.email_outbox FOR EACH ROW EXECUTE FUNCTION public.capture_audit_revision();


--
-- Name: email_outbox email_outbox_updated_at_version_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER email_outbox_updated_at_version_trigger BEFORE UPDATE ON public.email_outbox FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_and_version();


--
-- Name: identity_auth_effects identity_auth_effects_audit_revision_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER identity_auth_effects_audit_revision_trigger AFTER INSERT OR DELETE OR UPDATE ON public.identity_auth_effects FOR EACH ROW EXECUTE FUNCTION public.capture_audit_revision();


--
-- Name: identity_auth_effects identity_auth_effects_updated_at_version_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER identity_auth_effects_updated_at_version_trigger BEFORE UPDATE ON public.identity_auth_effects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_and_version();


--
-- Name: legal_documents legal_documents_audit_revision_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER legal_documents_audit_revision_trigger AFTER INSERT OR DELETE OR UPDATE ON public.legal_documents FOR EACH ROW EXECUTE FUNCTION public.capture_audit_revision();


--
-- Name: media_assets media_assets_audit_revision_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER media_assets_audit_revision_trigger AFTER INSERT OR DELETE OR UPDATE ON public.media_assets FOR EACH ROW EXECUTE FUNCTION public.capture_audit_revision();


--
-- Name: media_assets media_assets_updated_at_version_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER media_assets_updated_at_version_trigger BEFORE UPDATE ON public.media_assets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_and_version();


--
-- Name: moderation_cases moderation_cases_audit_revision_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER moderation_cases_audit_revision_trigger AFTER INSERT OR DELETE OR UPDATE ON public.moderation_cases FOR EACH ROW EXECUTE FUNCTION public.capture_audit_revision();


--
-- Name: moderation_cases moderation_cases_updated_at_version_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER moderation_cases_updated_at_version_trigger BEFORE UPDATE ON public.moderation_cases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_and_version();


--
-- Name: moderation_events moderation_events_audit_revision_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER moderation_events_audit_revision_trigger AFTER INSERT OR DELETE OR UPDATE ON public.moderation_events FOR EACH ROW EXECUTE FUNCTION public.capture_audit_revision();


--
-- Name: moderation_events moderation_events_immutable_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER moderation_events_immutable_trigger BEFORE DELETE OR UPDATE ON public.moderation_events FOR EACH ROW EXECUTE FUNCTION public.reject_immutable_history_mutation();


--
-- Name: moderation_events moderation_events_validate_insert_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER moderation_events_validate_insert_trigger BEFORE INSERT ON public.moderation_events FOR EACH ROW EXECUTE FUNCTION public.validate_moderation_event_insert();


--
-- Name: niches niches_audit_revision_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER niches_audit_revision_trigger AFTER INSERT OR DELETE OR UPDATE ON public.niches FOR EACH ROW EXECUTE FUNCTION public.capture_audit_revision();


--
-- Name: onboarding_drafts onboarding_drafts_updated_at_version_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER onboarding_drafts_updated_at_version_trigger BEFORE UPDATE ON public.onboarding_drafts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_and_version();


--
-- Name: social_profiles social_profiles_audit_revision_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER social_profiles_audit_revision_trigger AFTER INSERT OR DELETE OR UPDATE ON public.social_profiles FOR EACH ROW EXECUTE FUNCTION public.capture_audit_revision();


--
-- Name: social_profiles social_profiles_updated_at_version_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER social_profiles_updated_at_version_trigger BEFORE UPDATE ON public.social_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_and_version();


--
-- Name: sponsorship_placements sponsorship_placements_audit_revision_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER sponsorship_placements_audit_revision_trigger AFTER INSERT OR DELETE OR UPDATE ON public.sponsorship_placements FOR EACH ROW EXECUTE FUNCTION public.capture_audit_revision();


--
-- Name: sponsorship_placements sponsorship_placements_updated_at_version_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER sponsorship_placements_updated_at_version_trigger BEFORE UPDATE ON public.sponsorship_placements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_and_version();


--
-- Name: whatsapp_contact_confirmations whatsapp_contact_confirmations_audit_revision_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER whatsapp_contact_confirmations_audit_revision_trigger AFTER INSERT OR DELETE OR UPDATE ON public.whatsapp_contact_confirmations FOR EACH ROW EXECUTE FUNCTION public.capture_audit_revision();


--
-- Name: whatsapp_contact_confirmations whatsapp_contact_confirmations_updated_at_version_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER whatsapp_contact_confirmations_updated_at_version_trigger BEFORE UPDATE ON public.whatsapp_contact_confirmations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_and_version();


--
-- Name: account_consents account_consents_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_consents
    ADD CONSTRAINT account_consents_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: account_consents account_consents_legal_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_consents
    ADD CONSTRAINT account_consents_legal_document_id_fkey FOREIGN KEY (legal_document_id) REFERENCES public.legal_documents(id) ON DELETE RESTRICT;


--
-- Name: account_contact_preferences account_contact_preferences_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_contact_preferences
    ADD CONSTRAINT account_contact_preferences_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: account_contact_preferences account_contact_preferences_consent_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_contact_preferences
    ADD CONSTRAINT account_contact_preferences_consent_document_id_fkey FOREIGN KEY (consent_document_id) REFERENCES public.legal_documents(id) ON DELETE RESTRICT;


--
-- Name: accounts accounts_auth_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;


--
-- Name: audit_revisions audit_revisions_actor_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_revisions
    ADD CONSTRAINT audit_revisions_actor_account_id_fkey FOREIGN KEY (actor_account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: blocked_identities blocked_identities_blocked_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocked_identities
    ADD CONSTRAINT blocked_identities_blocked_by_account_id_fkey FOREIGN KEY (blocked_by_account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: blocked_identities blocked_identities_originating_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocked_identities
    ADD CONSTRAINT blocked_identities_originating_account_id_fkey FOREIGN KEY (originating_account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: blocked_identities blocked_identities_unblocked_by_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocked_identities
    ADD CONSTRAINT blocked_identities_unblocked_by_account_id_fkey FOREIGN KEY (unblocked_by_account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: company_locations company_locations_company_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_locations
    ADD CONSTRAINT company_locations_company_profile_id_fkey FOREIGN KEY (company_profile_id) REFERENCES public.company_profiles(id) ON DELETE RESTRICT;


--
-- Name: company_profiles company_profiles_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_profiles
    ADD CONSTRAINT company_profiles_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: company_profiles company_profiles_cover_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_profiles
    ADD CONSTRAINT company_profiles_cover_asset_id_fkey FOREIGN KEY (cover_asset_id) REFERENCES public.media_assets(id) ON DELETE RESTRICT;


--
-- Name: company_profiles company_profiles_logo_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_profiles
    ADD CONSTRAINT company_profiles_logo_asset_id_fkey FOREIGN KEY (logo_asset_id) REFERENCES public.media_assets(id) ON DELETE RESTRICT;


--
-- Name: creator_metric_snapshots creator_metric_snapshots_creator_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.creator_metric_snapshots
    ADD CONSTRAINT creator_metric_snapshots_creator_profile_id_fkey FOREIGN KEY (creator_profile_id) REFERENCES public.creator_profiles(id) ON DELETE RESTRICT;


--
-- Name: creator_metric_snapshots creator_metric_snapshots_social_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.creator_metric_snapshots
    ADD CONSTRAINT creator_metric_snapshots_social_profile_id_fkey FOREIGN KEY (social_profile_id) REFERENCES public.social_profiles(id) ON DELETE RESTRICT;


--
-- Name: creator_niches creator_niches_creator_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.creator_niches
    ADD CONSTRAINT creator_niches_creator_profile_id_fkey FOREIGN KEY (creator_profile_id) REFERENCES public.creator_profiles(id) ON DELETE RESTRICT;


--
-- Name: creator_niches creator_niches_niche_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.creator_niches
    ADD CONSTRAINT creator_niches_niche_id_fkey FOREIGN KEY (niche_id) REFERENCES public.niches(id) ON DELETE RESTRICT;


--
-- Name: creator_profiles creator_profiles_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.creator_profiles
    ADD CONSTRAINT creator_profiles_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: creator_profiles creator_profiles_avatar_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.creator_profiles
    ADD CONSTRAINT creator_profiles_avatar_asset_id_fkey FOREIGN KEY (avatar_asset_id) REFERENCES public.media_assets(id) ON DELETE RESTRICT;


--
-- Name: creator_profiles creator_profiles_cover_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.creator_profiles
    ADD CONSTRAINT creator_profiles_cover_asset_id_fkey FOREIGN KEY (cover_asset_id) REFERENCES public.media_assets(id) ON DELETE RESTRICT;


--
-- Name: email_attempts email_attempts_outbox_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_attempts
    ADD CONSTRAINT email_attempts_outbox_id_fkey FOREIGN KEY (outbox_id) REFERENCES public.email_outbox(id) ON DELETE RESTRICT;


--
-- Name: email_outbox email_outbox_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_outbox
    ADD CONSTRAINT email_outbox_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: identity_auth_effects identity_auth_effects_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_auth_effects
    ADD CONSTRAINT identity_auth_effects_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: identity_auth_effects identity_auth_effects_auth_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_auth_effects
    ADD CONSTRAINT identity_auth_effects_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;


--
-- Name: identity_auth_effects identity_auth_effects_moderation_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_auth_effects
    ADD CONSTRAINT identity_auth_effects_moderation_event_id_fkey FOREIGN KEY (moderation_event_id) REFERENCES public.moderation_events(id) ON DELETE RESTRICT;


--
-- Name: media_assets media_assets_owner_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_owner_account_id_fkey FOREIGN KEY (owner_account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: media_assets media_assets_replaced_by_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_replaced_by_asset_id_fkey FOREIGN KEY (replaced_by_asset_id) REFERENCES public.media_assets(id) ON DELETE RESTRICT;


--
-- Name: moderation_cases moderation_cases_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.moderation_cases
    ADD CONSTRAINT moderation_cases_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: moderation_cases moderation_cases_assigned_admin_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.moderation_cases
    ADD CONSTRAINT moderation_cases_assigned_admin_account_id_fkey FOREIGN KEY (assigned_admin_account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: moderation_events moderation_events_actor_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.moderation_events
    ADD CONSTRAINT moderation_events_actor_account_id_fkey FOREIGN KEY (actor_account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: moderation_events moderation_events_moderation_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.moderation_events
    ADD CONSTRAINT moderation_events_moderation_case_id_fkey FOREIGN KEY (moderation_case_id) REFERENCES public.moderation_cases(id) ON DELETE RESTRICT;


--
-- Name: onboarding_drafts onboarding_drafts_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_drafts
    ADD CONSTRAINT onboarding_drafts_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: social_profiles social_profiles_owner_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.social_profiles
    ADD CONSTRAINT social_profiles_owner_account_id_fkey FOREIGN KEY (owner_account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: sponsorship_placements sponsorship_placements_advertiser_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sponsorship_placements
    ADD CONSTRAINT sponsorship_placements_advertiser_account_id_fkey FOREIGN KEY (advertiser_account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: sponsorship_placements sponsorship_placements_creative_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sponsorship_placements
    ADD CONSTRAINT sponsorship_placements_creative_asset_id_fkey FOREIGN KEY (creative_asset_id) REFERENCES public.media_assets(id) ON DELETE RESTRICT;


--
-- Name: sponsorship_placements sponsorship_placements_creative_asset_mobile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sponsorship_placements
    ADD CONSTRAINT sponsorship_placements_creative_asset_mobile_id_fkey FOREIGN KEY (creative_asset_mobile_id) REFERENCES public.media_assets(id) ON DELETE RESTRICT;


--
-- Name: sponsorship_placements sponsorship_placements_creative_asset_tablet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sponsorship_placements
    ADD CONSTRAINT sponsorship_placements_creative_asset_tablet_id_fkey FOREIGN KEY (creative_asset_tablet_id) REFERENCES public.media_assets(id) ON DELETE RESTRICT;


--
-- Name: sponsorship_placements sponsorship_placements_featured_creator_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sponsorship_placements
    ADD CONSTRAINT sponsorship_placements_featured_creator_profile_id_fkey FOREIGN KEY (featured_creator_profile_id) REFERENCES public.creator_profiles(id) ON DELETE RESTRICT;


--
-- Name: whatsapp_contact_confirmations whatsapp_contact_confirmations_company_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_contact_confirmations
    ADD CONSTRAINT whatsapp_contact_confirmations_company_account_id_fkey FOREIGN KEY (company_account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: whatsapp_contact_confirmations whatsapp_contact_confirmations_creator_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_contact_confirmations
    ADD CONSTRAINT whatsapp_contact_confirmations_creator_profile_id_fkey FOREIGN KEY (creator_profile_id) REFERENCES public.creator_profiles(id) ON DELETE RESTRICT;


--
-- Name: account_consents; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.account_consents ENABLE ROW LEVEL SECURITY;

--
-- Name: account_consents account_consents_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY account_consents_insert_policy ON public.account_consents FOR INSERT TO contente_app_user WITH CHECK ((public.app_is_admin() OR (public.app_can_edit_own_profile() AND (account_id = public.app_current_account_id()))));


--
-- Name: account_consents account_consents_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY account_consents_select_policy ON public.account_consents FOR SELECT TO contente_app_user USING ((public.app_is_admin() OR (public.app_context_is_verified() AND (account_id = public.app_current_account_id()))));


--
-- Name: account_contact_preferences; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.account_contact_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: account_contact_preferences account_contact_preferences_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY account_contact_preferences_insert_policy ON public.account_contact_preferences FOR INSERT TO contente_app_user WITH CHECK ((public.app_is_admin() OR (public.app_can_edit_own_profile() AND (public.app_current_role() = 'INFLUENCER'::public.account_role) AND (account_id = public.app_current_account_id()))));


--
-- Name: account_contact_preferences account_contact_preferences_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY account_contact_preferences_select_policy ON public.account_contact_preferences FOR SELECT TO contente_app_user USING ((public.app_is_admin() OR (account_id = public.app_current_account_id()) OR (public.app_is_approved_viewer() AND (public.app_current_role() = 'COMPANY'::public.account_role) AND (archived_at IS NULL) AND public.app_account_is_approved(account_id) AND (public.app_account_role(account_id) = 'INFLUENCER'::public.account_role))));


--
-- Name: account_contact_preferences account_contact_preferences_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY account_contact_preferences_update_policy ON public.account_contact_preferences FOR UPDATE TO contente_app_user USING ((public.app_is_admin() OR (public.app_can_edit_own_profile() AND (public.app_current_role() = 'INFLUENCER'::public.account_role) AND (account_id = public.app_current_account_id())))) WITH CHECK ((public.app_is_admin() OR (public.app_can_edit_own_profile() AND (public.app_current_role() = 'INFLUENCER'::public.account_role) AND (account_id = public.app_current_account_id()))));


--
-- Name: accounts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: accounts accounts_admin_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY accounts_admin_update_policy ON public.accounts FOR UPDATE TO contente_app_user USING (public.app_is_admin()) WITH CHECK (public.app_is_admin());


--
-- Name: accounts accounts_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY accounts_select_policy ON public.accounts FOR SELECT TO contente_app_user USING ((public.app_context_is_verified() AND ((id = public.app_current_account_id()) OR public.app_is_admin() OR (public.app_is_approved_viewer() AND (status = 'APPROVED'::public.account_status) AND (archived_at IS NULL) AND (((public.app_current_role() = 'COMPANY'::public.account_role) AND (role = ANY (ARRAY['INFLUENCER'::public.account_role, 'COMPANY'::public.account_role]))) OR (public.app_current_role() = 'INFLUENCER'::public.account_role))))));


--
-- Name: audit_revisions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_revisions ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_revisions audit_revisions_admin_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY audit_revisions_admin_select_policy ON public.audit_revisions FOR SELECT TO contente_app_user USING (public.app_is_admin());


--
-- Name: blocked_identities; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.blocked_identities ENABLE ROW LEVEL SECURITY;

--
-- Name: blocked_identities blocked_identities_admin_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY blocked_identities_admin_insert_policy ON public.blocked_identities FOR INSERT TO contente_app_user WITH CHECK (public.app_is_admin());


--
-- Name: blocked_identities blocked_identities_admin_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY blocked_identities_admin_select_policy ON public.blocked_identities FOR SELECT TO contente_app_user USING (public.app_is_admin());


--
-- Name: blocked_identities blocked_identities_admin_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY blocked_identities_admin_update_policy ON public.blocked_identities FOR UPDATE TO contente_app_user USING (public.app_is_admin()) WITH CHECK (public.app_is_admin());


--
-- Name: blocked_identities blocked_identities_auth_hook_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY blocked_identities_auth_hook_select_policy ON public.blocked_identities FOR SELECT TO supabase_auth_admin USING (((unblocked_at IS NULL) AND (archived_at IS NULL)));


--
-- Name: company_locations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.company_locations ENABLE ROW LEVEL SECURITY;

--
-- Name: company_locations company_locations_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY company_locations_insert_policy ON public.company_locations FOR INSERT TO contente_app_user WITH CHECK ((public.app_is_admin() OR (public.app_can_edit_own_profile() AND (public.app_current_role() = 'COMPANY'::public.account_role) AND public.app_company_profile_is_owned(company_profile_id))));


--
-- Name: company_locations company_locations_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY company_locations_select_policy ON public.company_locations FOR SELECT TO contente_app_user USING ((public.app_is_admin() OR public.app_company_profile_is_owned(company_profile_id)));


--
-- Name: company_locations company_locations_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY company_locations_update_policy ON public.company_locations FOR UPDATE TO contente_app_user USING ((public.app_is_admin() OR (public.app_can_edit_own_profile() AND (public.app_current_role() = 'COMPANY'::public.account_role) AND public.app_company_profile_is_owned(company_profile_id)))) WITH CHECK ((public.app_is_admin() OR (public.app_can_edit_own_profile() AND (public.app_current_role() = 'COMPANY'::public.account_role) AND public.app_company_profile_is_owned(company_profile_id))));


--
-- Name: company_profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: company_profiles company_profiles_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY company_profiles_insert_policy ON public.company_profiles FOR INSERT TO contente_app_user WITH CHECK ((public.app_is_admin() OR (public.app_can_edit_own_profile() AND (public.app_current_role() = 'COMPANY'::public.account_role) AND (account_id = public.app_current_account_id()))));


--
-- Name: company_profiles company_profiles_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY company_profiles_select_policy ON public.company_profiles FOR SELECT TO contente_app_user USING ((public.app_context_is_verified() AND ((account_id = public.app_current_account_id()) OR public.app_is_admin() OR (public.app_is_approved_viewer() AND (archived_at IS NULL) AND public.app_account_is_approved(account_id)))));


--
-- Name: company_profiles company_profiles_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY company_profiles_update_policy ON public.company_profiles FOR UPDATE TO contente_app_user USING ((public.app_is_admin() OR (public.app_can_edit_own_profile() AND (public.app_current_role() = 'COMPANY'::public.account_role) AND (account_id = public.app_current_account_id())))) WITH CHECK ((public.app_is_admin() OR (public.app_can_edit_own_profile() AND (public.app_current_role() = 'COMPANY'::public.account_role) AND (account_id = public.app_current_account_id()))));


--
-- Name: creator_metric_snapshots; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.creator_metric_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: creator_metric_snapshots creator_metric_snapshots_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY creator_metric_snapshots_insert_policy ON public.creator_metric_snapshots FOR INSERT TO contente_app_user WITH CHECK ((public.app_is_admin() OR (public.app_can_edit_own_profile() AND (public.app_current_role() = 'INFLUENCER'::public.account_role) AND public.app_creator_profile_is_owned(creator_profile_id))));


--
-- Name: creator_metric_snapshots creator_metric_snapshots_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY creator_metric_snapshots_select_policy ON public.creator_metric_snapshots FOR SELECT TO contente_app_user USING ((public.app_is_admin() OR public.app_creator_profile_is_owned(creator_profile_id) OR (public.app_is_approved_viewer() AND public.app_creator_profile_is_approved(creator_profile_id))));


--
-- Name: creator_metric_snapshots creator_metric_snapshots_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY creator_metric_snapshots_update_policy ON public.creator_metric_snapshots FOR UPDATE TO contente_app_user USING ((public.app_is_admin() OR (public.app_can_edit_own_profile() AND (public.app_current_role() = 'INFLUENCER'::public.account_role) AND public.app_creator_profile_is_owned(creator_profile_id)))) WITH CHECK ((public.app_is_admin() OR (public.app_can_edit_own_profile() AND (public.app_current_role() = 'INFLUENCER'::public.account_role) AND public.app_creator_profile_is_owned(creator_profile_id))));


--
-- Name: creator_niches; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.creator_niches ENABLE ROW LEVEL SECURITY;

--
-- Name: creator_niches creator_niches_delete_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY creator_niches_delete_policy ON public.creator_niches FOR DELETE TO contente_app_user USING ((public.app_is_admin() OR (public.app_can_edit_own_profile() AND (public.app_current_role() = 'INFLUENCER'::public.account_role) AND public.app_creator_profile_is_owned(creator_profile_id))));


--
-- Name: creator_niches creator_niches_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY creator_niches_insert_policy ON public.creator_niches FOR INSERT TO contente_app_user WITH CHECK ((public.app_is_admin() OR (public.app_can_edit_own_profile() AND (public.app_current_role() = 'INFLUENCER'::public.account_role) AND public.app_creator_profile_is_owned(creator_profile_id))));


--
-- Name: creator_niches creator_niches_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY creator_niches_select_policy ON public.creator_niches FOR SELECT TO contente_app_user USING ((public.app_is_admin() OR public.app_creator_profile_is_owned(creator_profile_id) OR (public.app_is_approved_viewer() AND public.app_creator_profile_is_approved(creator_profile_id))));


--
-- Name: creator_profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: creator_profiles creator_profiles_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY creator_profiles_insert_policy ON public.creator_profiles FOR INSERT TO contente_app_user WITH CHECK ((public.app_is_admin() OR (public.app_can_edit_own_profile() AND (public.app_current_role() = 'INFLUENCER'::public.account_role) AND (account_id = public.app_current_account_id()))));


--
-- Name: creator_profiles creator_profiles_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY creator_profiles_select_policy ON public.creator_profiles FOR SELECT TO contente_app_user USING ((public.app_context_is_verified() AND ((account_id = public.app_current_account_id()) OR public.app_is_admin() OR (public.app_is_approved_viewer() AND (archived_at IS NULL) AND public.app_account_is_approved(account_id)))));


--
-- Name: creator_profiles creator_profiles_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY creator_profiles_update_policy ON public.creator_profiles FOR UPDATE TO contente_app_user USING ((public.app_is_admin() OR (public.app_can_edit_own_profile() AND (public.app_current_role() = 'INFLUENCER'::public.account_role) AND (account_id = public.app_current_account_id())))) WITH CHECK ((public.app_is_admin() OR (public.app_can_edit_own_profile() AND (public.app_current_role() = 'INFLUENCER'::public.account_role) AND (account_id = public.app_current_account_id()))));


--
-- Name: email_attempts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.email_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: email_attempts email_attempts_admin_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY email_attempts_admin_select_policy ON public.email_attempts FOR SELECT TO contente_app_user USING (public.app_is_admin());


--
-- Name: email_outbox; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

--
-- Name: email_outbox email_outbox_admin_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY email_outbox_admin_select_policy ON public.email_outbox FOR SELECT TO contente_app_user USING (public.app_is_admin());


--
-- Name: email_outbox email_outbox_admin_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY email_outbox_admin_update_policy ON public.email_outbox FOR UPDATE TO contente_app_user USING (public.app_is_admin()) WITH CHECK (public.app_is_admin());


--
-- Name: identity_auth_effects; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.identity_auth_effects ENABLE ROW LEVEL SECURITY;

--
-- Name: identity_auth_effects identity_auth_effects_admin_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY identity_auth_effects_admin_select_policy ON public.identity_auth_effects FOR SELECT TO contente_app_user USING (public.app_is_admin());


--
-- Name: legal_documents; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_documents legal_documents_admin_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY legal_documents_admin_insert_policy ON public.legal_documents FOR INSERT TO contente_app_user WITH CHECK (public.app_is_admin());


--
-- Name: legal_documents legal_documents_admin_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY legal_documents_admin_update_policy ON public.legal_documents FOR UPDATE TO contente_app_user USING (public.app_is_admin()) WITH CHECK (public.app_is_admin());


--
-- Name: legal_documents legal_documents_app_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY legal_documents_app_select_policy ON public.legal_documents FOR SELECT TO contente_app_user USING ((public.app_is_admin() OR (public.app_context_is_verified() AND (public.app_current_status() <> 'BANNED'::public.account_status) AND (retired_at IS NULL) AND (active_from <= now()))));


--
-- Name: legal_documents legal_documents_public_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY legal_documents_public_select_policy ON public.legal_documents FOR SELECT TO authenticated, anon USING (((retired_at IS NULL) AND (active_from <= now())));


--
-- Name: media_assets; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

--
-- Name: media_assets media_assets_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY media_assets_insert_policy ON public.media_assets FOR INSERT TO contente_app_user WITH CHECK ((public.app_is_admin() OR (public.app_can_edit_own_profile() AND (owner_account_id = public.app_current_account_id()) AND (kind <> 'SPONSORSHIP_CREATIVE'::public.media_kind))));


--
-- Name: media_assets media_assets_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY media_assets_select_policy ON public.media_assets FOR SELECT TO contente_app_user USING ((public.app_is_admin() OR (owner_account_id = public.app_current_account_id()) OR (public.app_is_approved_viewer() AND (status = 'ACTIVE'::public.media_status) AND (archived_at IS NULL) AND public.app_account_is_approved(owner_account_id) AND (((public.app_account_role(owner_account_id) = 'INFLUENCER'::public.account_role) AND (kind = ANY (ARRAY['AVATAR'::public.media_kind, 'COVER'::public.media_kind]))) OR ((public.app_current_role() = 'INFLUENCER'::public.account_role) AND (public.app_account_role(owner_account_id) = 'COMPANY'::public.account_role) AND (kind = 'LOGO'::public.media_kind))))));


--
-- Name: media_assets media_assets_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY media_assets_update_policy ON public.media_assets FOR UPDATE TO contente_app_user USING ((public.app_is_admin() OR (public.app_can_edit_own_profile() AND (owner_account_id = public.app_current_account_id()) AND (kind <> 'SPONSORSHIP_CREATIVE'::public.media_kind)))) WITH CHECK ((public.app_is_admin() OR (public.app_can_edit_own_profile() AND (owner_account_id = public.app_current_account_id()) AND (kind <> 'SPONSORSHIP_CREATIVE'::public.media_kind))));


--
-- Name: moderation_cases; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.moderation_cases ENABLE ROW LEVEL SECURITY;

--
-- Name: moderation_cases moderation_cases_admin_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY moderation_cases_admin_update_policy ON public.moderation_cases FOR UPDATE TO contente_app_user USING (public.app_is_admin()) WITH CHECK (public.app_is_admin());


--
-- Name: moderation_cases moderation_cases_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY moderation_cases_select_policy ON public.moderation_cases FOR SELECT TO contente_app_user USING ((public.app_is_admin() OR (public.app_context_is_verified() AND (public.app_current_status() <> 'BANNED'::public.account_status) AND (account_id = public.app_current_account_id()))));


--
-- Name: moderation_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.moderation_events ENABLE ROW LEVEL SECURITY;

--
-- Name: moderation_events moderation_events_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY moderation_events_select_policy ON public.moderation_events FOR SELECT TO contente_app_user USING ((public.app_is_admin() OR (public.app_context_is_verified() AND (public.app_current_status() <> 'BANNED'::public.account_status) AND public.app_moderation_case_is_owned(moderation_case_id))));


--
-- Name: niches; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.niches ENABLE ROW LEVEL SECURITY;

--
-- Name: niches niches_admin_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY niches_admin_insert_policy ON public.niches FOR INSERT TO contente_app_user WITH CHECK (public.app_is_admin());


--
-- Name: niches niches_admin_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY niches_admin_update_policy ON public.niches FOR UPDATE TO contente_app_user USING (public.app_is_admin()) WITH CHECK (public.app_is_admin());


--
-- Name: niches niches_creator_custom_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY niches_creator_custom_insert_policy ON public.niches FOR INSERT TO contente_app_user WITH CHECK ((public.app_can_edit_own_profile() AND (public.app_current_role() = 'INFLUENCER'::public.account_role) AND ((slug)::text ~~ 'personalizado-%'::text) AND (sort_order = 1000) AND is_active));


--
-- Name: niches niches_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY niches_select_policy ON public.niches FOR SELECT TO contente_app_user USING ((public.app_context_is_verified() AND (public.app_is_admin() OR (public.app_current_status() = ANY (ARRAY['ONBOARDING'::public.account_status, 'PENDING_REVIEW'::public.account_status, 'CHANGES_REQUESTED'::public.account_status, 'APPROVED'::public.account_status])))));


--
-- Name: onboarding_drafts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.onboarding_drafts ENABLE ROW LEVEL SECURITY;

--
-- Name: onboarding_drafts onboarding_drafts_owner_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY onboarding_drafts_owner_insert_policy ON public.onboarding_drafts FOR INSERT TO contente_app_user WITH CHECK ((public.app_context_is_verified() AND (account_id = public.app_current_account_id()) AND (role = public.app_current_role()) AND (public.app_current_role() = ANY (ARRAY['INFLUENCER'::public.account_role, 'COMPANY'::public.account_role])) AND (public.app_current_status() = ANY (ARRAY['ONBOARDING'::public.account_status, 'CHANGES_REQUESTED'::public.account_status]))));


--
-- Name: onboarding_drafts onboarding_drafts_owner_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY onboarding_drafts_owner_select_policy ON public.onboarding_drafts FOR SELECT TO contente_app_user USING ((public.app_context_is_verified() AND (account_id = public.app_current_account_id()) AND (role = public.app_current_role()) AND (public.app_current_role() = ANY (ARRAY['INFLUENCER'::public.account_role, 'COMPANY'::public.account_role])) AND (public.app_current_status() = ANY (ARRAY['ONBOARDING'::public.account_status, 'CHANGES_REQUESTED'::public.account_status]))));


--
-- Name: onboarding_drafts onboarding_drafts_owner_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY onboarding_drafts_owner_update_policy ON public.onboarding_drafts FOR UPDATE TO contente_app_user USING ((public.app_context_is_verified() AND (account_id = public.app_current_account_id()) AND (role = public.app_current_role()) AND (public.app_current_role() = ANY (ARRAY['INFLUENCER'::public.account_role, 'COMPANY'::public.account_role])) AND (public.app_current_status() = ANY (ARRAY['ONBOARDING'::public.account_status, 'CHANGES_REQUESTED'::public.account_status])))) WITH CHECK ((public.app_context_is_verified() AND (account_id = public.app_current_account_id()) AND (role = public.app_current_role()) AND (public.app_current_role() = ANY (ARRAY['INFLUENCER'::public.account_role, 'COMPANY'::public.account_role])) AND (public.app_current_status() = ANY (ARRAY['ONBOARDING'::public.account_status, 'CHANGES_REQUESTED'::public.account_status]))));


--
-- Name: rate_limit_buckets; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: social_profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.social_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: social_profiles social_profiles_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY social_profiles_insert_policy ON public.social_profiles FOR INSERT TO contente_app_user WITH CHECK ((public.app_is_admin() OR (public.app_can_edit_own_profile() AND (owner_account_id = public.app_current_account_id()))));


--
-- Name: social_profiles social_profiles_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY social_profiles_select_policy ON public.social_profiles FOR SELECT TO contente_app_user USING ((public.app_is_admin() OR (owner_account_id = public.app_current_account_id()) OR (public.app_is_approved_viewer() AND (archived_at IS NULL) AND is_visible_in_catalog AND public.app_account_is_approved(owner_account_id) AND (public.app_account_role(owner_account_id) = 'INFLUENCER'::public.account_role))));


--
-- Name: social_profiles social_profiles_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY social_profiles_update_policy ON public.social_profiles FOR UPDATE TO contente_app_user USING ((public.app_is_admin() OR (public.app_can_edit_own_profile() AND (owner_account_id = public.app_current_account_id())))) WITH CHECK ((public.app_is_admin() OR (public.app_can_edit_own_profile() AND (owner_account_id = public.app_current_account_id()))));


--
-- Name: sponsorship_placements; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.sponsorship_placements ENABLE ROW LEVEL SECURITY;

--
-- Name: sponsorship_placements sponsorship_placements_admin_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sponsorship_placements_admin_insert_policy ON public.sponsorship_placements FOR INSERT TO contente_app_user WITH CHECK (public.app_is_admin());


--
-- Name: sponsorship_placements sponsorship_placements_admin_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sponsorship_placements_admin_update_policy ON public.sponsorship_placements FOR UPDATE TO contente_app_user USING (public.app_is_admin()) WITH CHECK (public.app_is_admin());


--
-- Name: sponsorship_placements sponsorship_placements_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sponsorship_placements_select_policy ON public.sponsorship_placements FOR SELECT TO contente_app_user USING ((public.app_is_admin() OR (public.app_is_approved_viewer() AND is_active AND (archived_at IS NULL) AND ((starts_at IS NULL) OR (starts_at <= now())) AND ((ends_at IS NULL) OR (ends_at >= now())) AND ((audience = 'ALL'::public.placement_audience) OR ((audience)::text = (public.app_current_role())::text)))));


--
-- Name: whatsapp_contact_confirmations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.whatsapp_contact_confirmations ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_contact_confirmations whatsapp_contact_confirmations_company_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY whatsapp_contact_confirmations_company_select_policy ON public.whatsapp_contact_confirmations FOR SELECT TO contente_app_user USING ((company_account_id = public.app_current_account_id()));


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO contente_app_user;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;


--
-- Name: FUNCTION app_account_is_approved(target_account_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_account_is_approved(target_account_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_account_is_approved(target_account_id uuid) TO contente_app_user;


--
-- Name: FUNCTION app_account_role(target_account_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_account_role(target_account_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_account_role(target_account_id uuid) TO contente_app_user;


--
-- Name: FUNCTION app_apply_admin_moderation(target_account_id uuid, transition_action public.moderation_action, transition_reason text, expected_account_version integer, expected_profile_version integer, command_idempotency_key text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_apply_admin_moderation(target_account_id uuid, transition_action public.moderation_action, transition_reason text, expected_account_version integer, expected_profile_version integer, command_idempotency_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_apply_admin_moderation(target_account_id uuid, transition_action public.moderation_action, transition_reason text, expected_account_version integer, expected_profile_version integer, command_idempotency_key text) TO contente_app_user;


--
-- Name: FUNCTION app_assert_moderation_transition(transition_from public.account_status, transition_to public.account_status, transition_action public.moderation_action, trusted_actor_role public.account_role, trusted_actor_is_owner boolean, transition_reason text, last_status_before_ban public.account_status); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_assert_moderation_transition(transition_from public.account_status, transition_to public.account_status, transition_action public.moderation_action, trusted_actor_role public.account_role, trusted_actor_is_owner boolean, transition_reason text, last_status_before_ban public.account_status) FROM PUBLIC;


--
-- Name: FUNCTION app_can_edit_own_profile(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_can_edit_own_profile() FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_can_edit_own_profile() TO contente_app_user;


--
-- Name: FUNCTION app_company_profile_is_owned(target_profile_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_company_profile_is_owned(target_profile_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_company_profile_is_owned(target_profile_id uuid) TO contente_app_user;


--
-- Name: FUNCTION app_complete_identity_auth_effect(target_effect_id uuid, sync_succeeded boolean, sync_error_category text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_complete_identity_auth_effect(target_effect_id uuid, sync_succeeded boolean, sync_error_category text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_complete_identity_auth_effect(target_effect_id uuid, sync_succeeded boolean, sync_error_category text) TO contente_app_user;


--
-- Name: FUNCTION app_confirm_whatsapp_contact(confirmation_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_confirm_whatsapp_contact(confirmation_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_confirm_whatsapp_contact(confirmation_id uuid) TO contente_app_user;


--
-- Name: FUNCTION app_context_is_verified(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_context_is_verified() FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_context_is_verified() TO contente_app_user;


--
-- Name: FUNCTION app_creator_profile_is_approved(target_profile_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_creator_profile_is_approved(target_profile_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_creator_profile_is_approved(target_profile_id uuid) TO contente_app_user;


--
-- Name: FUNCTION app_creator_profile_is_owned(target_profile_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_creator_profile_is_owned(target_profile_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_creator_profile_is_owned(target_profile_id uuid) TO contente_app_user;


--
-- Name: FUNCTION app_current_account_id(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_current_account_id() FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_current_account_id() TO contente_app_user;


--
-- Name: FUNCTION app_current_auth_user_id(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_current_auth_user_id() FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_current_auth_user_id() TO contente_app_user;


--
-- Name: FUNCTION app_current_role(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_current_role() FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_current_role() TO contente_app_user;


--
-- Name: FUNCTION app_current_status(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_current_status() FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_current_status() TO contente_app_user;


--
-- Name: FUNCTION app_identity_key_hash(raw_value text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_identity_key_hash(raw_value text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_identity_key_hash(raw_value text) TO supabase_auth_admin;
GRANT ALL ON FUNCTION public.app_identity_key_hash(raw_value text) TO contente_app_user;


--
-- Name: FUNCTION app_identity_subject_hash(raw_value text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_identity_subject_hash(raw_value text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_identity_subject_hash(raw_value text) TO supabase_auth_admin;
GRANT ALL ON FUNCTION public.app_identity_subject_hash(raw_value text) TO contente_app_user;


--
-- Name: FUNCTION app_is_admin(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_is_admin() FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_is_admin() TO contente_app_user;


--
-- Name: FUNCTION app_is_approved_viewer(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_is_approved_viewer() FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_is_approved_viewer() TO contente_app_user;


--
-- Name: FUNCTION app_moderation_case_is_owned(target_case_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_moderation_case_is_owned(target_case_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_moderation_case_is_owned(target_case_id uuid) TO contente_app_user;


--
-- Name: FUNCTION app_moderation_transition_is_allowed(transition_from public.account_status, transition_to public.account_status, transition_action public.moderation_action); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_moderation_transition_is_allowed(transition_from public.account_status, transition_to public.account_status, transition_action public.moderation_action) FROM PUBLIC;


--
-- Name: FUNCTION app_record_whatsapp_contact_click(target_creator_profile_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_record_whatsapp_contact_click(target_creator_profile_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_record_whatsapp_contact_click(target_creator_profile_id uuid) TO contente_app_user;


--
-- Name: FUNCTION app_resubmit_moderation(target_account_id uuid, expected_account_version integer, expected_profile_version integer, command_idempotency_key text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_resubmit_moderation(target_account_id uuid, expected_account_version integer, expected_profile_version integer, command_idempotency_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_resubmit_moderation(target_account_id uuid, expected_account_version integer, expected_profile_version integer, command_idempotency_key text) TO contente_app_user;


--
-- Name: FUNCTION app_resubmit_moderation_with_outbox(target_account_id uuid, expected_account_version integer, expected_profile_version integer, request_idempotency_key text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_resubmit_moderation_with_outbox(target_account_id uuid, expected_account_version integer, expected_profile_version integer, request_idempotency_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_resubmit_moderation_with_outbox(target_account_id uuid, expected_account_version integer, expected_profile_version integer, request_idempotency_key text) TO contente_app_user;


--
-- Name: FUNCTION app_set_profile_completion(target_account_id uuid, expected_role public.account_role, calculated_percentage smallint, calculator_version integer); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_set_profile_completion(target_account_id uuid, expected_role public.account_role, calculated_percentage smallint, calculator_version integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_set_profile_completion(target_account_id uuid, expected_role public.account_role, calculated_percentage smallint, calculator_version integer) TO contente_app_user;


--
-- Name: FUNCTION app_storage_can_manage_profile_object(object_name text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_storage_can_manage_profile_object(object_name text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_storage_can_manage_profile_object(object_name text) TO authenticated;


--
-- Name: FUNCTION app_storage_can_manage_sponsorship_object(object_name text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_storage_can_manage_sponsorship_object(object_name text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_storage_can_manage_sponsorship_object(object_name text) TO authenticated;


--
-- Name: FUNCTION app_storage_can_read_profile_object(object_name text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_storage_can_read_profile_object(object_name text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_storage_can_read_profile_object(object_name text) TO authenticated;


--
-- Name: FUNCTION app_storage_can_read_sponsorship_object(object_name text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.app_storage_can_read_sponsorship_object(object_name text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.app_storage_can_read_sponsorship_object(object_name text) TO authenticated;


--
-- Name: FUNCTION before_user_created(event jsonb); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.before_user_created(event jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.before_user_created(event jsonb) TO supabase_auth_admin;


--
-- Name: FUNCTION capture_audit_revision(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.capture_audit_revision() FROM PUBLIC;


--
-- Name: FUNCTION consume_rate_limit(target_scope text, target_key_hash text, target_limit integer, target_window_seconds integer); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.consume_rate_limit(target_scope text, target_key_hash text, target_limit integer, target_window_seconds integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.consume_rate_limit(target_scope text, target_key_hash text, target_limit integer, target_window_seconds integer) TO service_role;


--
-- Name: FUNCTION provision_additional_admin(target_auth_user_id uuid, target_email text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.provision_additional_admin(target_auth_user_id uuid, target_email text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.provision_additional_admin(target_auth_user_id uuid, target_email text) TO contente_app_user;


--
-- Name: FUNCTION validate_moderation_event_insert(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.validate_moderation_event_insert() FROM PUBLIC;


--
-- Name: TABLE account_consents; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.account_consents TO service_role;
GRANT SELECT,INSERT ON TABLE public.account_consents TO contente_app_user;


--
-- Name: TABLE account_contact_preferences; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.account_contact_preferences TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.account_contact_preferences TO contente_app_user;


--
-- Name: TABLE accounts; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.accounts TO service_role;
GRANT SELECT,UPDATE ON TABLE public.accounts TO contente_app_user;


--
-- Name: TABLE audit_revisions; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.audit_revisions TO service_role;
GRANT SELECT ON TABLE public.audit_revisions TO contente_app_user;


--
-- Name: SEQUENCE audit_revisions_revision_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE ON SEQUENCE public.audit_revisions_revision_seq TO anon;
GRANT UPDATE ON SEQUENCE public.audit_revisions_revision_seq TO authenticated;
GRANT UPDATE ON SEQUENCE public.audit_revisions_revision_seq TO service_role;


--
-- Name: TABLE blocked_identities; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.blocked_identities TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.blocked_identities TO contente_app_user;


--
-- Name: COLUMN blocked_identities.provider; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT(provider) ON TABLE public.blocked_identities TO supabase_auth_admin;


--
-- Name: COLUMN blocked_identities.identity_key_hash; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT(identity_key_hash) ON TABLE public.blocked_identities TO supabase_auth_admin;


--
-- Name: COLUMN blocked_identities.provider_subject_hash; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT(provider_subject_hash) ON TABLE public.blocked_identities TO supabase_auth_admin;


--
-- Name: COLUMN blocked_identities.unblocked_at; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT(unblocked_at) ON TABLE public.blocked_identities TO supabase_auth_admin;


--
-- Name: COLUMN blocked_identities.archived_at; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT(archived_at) ON TABLE public.blocked_identities TO supabase_auth_admin;


--
-- Name: TABLE company_locations; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.company_locations TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.company_locations TO contente_app_user;


--
-- Name: TABLE company_profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.company_profiles TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.company_profiles TO contente_app_user;


--
-- Name: TABLE creator_metric_snapshots; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.creator_metric_snapshots TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.creator_metric_snapshots TO contente_app_user;


--
-- Name: TABLE creator_niches; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.creator_niches TO service_role;
GRANT SELECT,INSERT,DELETE ON TABLE public.creator_niches TO contente_app_user;


--
-- Name: TABLE creator_profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.creator_profiles TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.creator_profiles TO contente_app_user;


--
-- Name: TABLE email_attempts; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.email_attempts TO service_role;
GRANT SELECT ON TABLE public.email_attempts TO contente_app_user;


--
-- Name: TABLE email_outbox; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.email_outbox TO service_role;
GRANT SELECT,UPDATE ON TABLE public.email_outbox TO contente_app_user;


--
-- Name: TABLE identity_auth_effects; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.identity_auth_effects TO service_role;
GRANT SELECT ON TABLE public.identity_auth_effects TO contente_app_user;


--
-- Name: TABLE legal_documents; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.legal_documents TO service_role;
GRANT SELECT ON TABLE public.legal_documents TO anon;
GRANT SELECT ON TABLE public.legal_documents TO authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE public.legal_documents TO contente_app_user;


--
-- Name: TABLE media_assets; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.media_assets TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.media_assets TO contente_app_user;


--
-- Name: TABLE moderation_cases; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.moderation_cases TO service_role;
GRANT SELECT,UPDATE ON TABLE public.moderation_cases TO contente_app_user;


--
-- Name: TABLE moderation_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.moderation_events TO service_role;
GRANT SELECT ON TABLE public.moderation_events TO contente_app_user;


--
-- Name: TABLE niches; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.niches TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.niches TO contente_app_user;


--
-- Name: TABLE onboarding_drafts; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.onboarding_drafts TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.onboarding_drafts TO contente_app_user;


--
-- Name: TABLE rate_limit_buckets; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.rate_limit_buckets TO service_role;


--
-- Name: TABLE social_profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.social_profiles TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.social_profiles TO contente_app_user;


--
-- Name: TABLE sponsorship_placements; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.sponsorship_placements TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.sponsorship_placements TO contente_app_user;


--
-- Name: TABLE whatsapp_contact_confirmations; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.whatsapp_contact_confirmations TO service_role;
GRANT SELECT ON TABLE public.whatsapp_contact_confirmations TO contente_app_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT UPDATE ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT UPDATE ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT UPDATE ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--



--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--



--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--



--
-- PostgreSQL database dump complete
--

-- ---------------------------------------------------------------------------
-- 2. Storage buckets and object policies
-- ---------------------------------------------------------------------------
-- Private media buckets and Storage RLS. Object bytes are immutable from the
-- application perspective: replacement uploads use a new path and deletion is
-- reserved for the reviewed retention/cleanup operation.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'profile-media',
    'profile-media',
    false,
    8388608,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'sponsorship-media',
    'sponsorship-media',
    false,
    8388608,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  updated_at = now();

drop policy if exists "profile media authorized read"
  on storage.objects;
create policy "profile media authorized read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-media'
  and public.app_storage_can_read_profile_object(name)
);

drop policy if exists "profile media owner immutable upload"
  on storage.objects;
create policy "profile media owner immutable upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-media'
  and (owner_id is null or owner_id = auth.uid()::text)
  and public.app_storage_can_manage_profile_object(name)
);

drop policy if exists "sponsorship media authorized read"
  on storage.objects;
create policy "sponsorship media authorized read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'sponsorship-media'
  and public.app_storage_can_read_sponsorship_object(name)
);

drop policy if exists "sponsorship media admin immutable upload"
  on storage.objects;
create policy "sponsorship media admin immutable upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'sponsorship-media'
  and (owner_id is null or owner_id = auth.uid()::text)
  and public.app_storage_can_manage_sponsorship_object(name)
);

-- ---------------------------------------------------------------------------
-- 3. Reference data
-- ---------------------------------------------------------------------------

INSERT INTO public.legal_documents (id, document_type, version_label, content_hash, document_url, published_at, active_from, retired_at, created_at) VALUES ('a8fa8d71-5b63-40c2-ad65-0401101fdfeb', 'TERMS', 'BETA-PLACEHOLDER-v1', 'd7aa9701cfe20abf36cc97ab0ae12ac01e542154191f97871f5f28a78d99bfff', NULL, '2026-09-11 17:53:41.895688+00', '2026-09-11 17:53:41.895688+00', NULL, '2026-09-11 17:53:41.895688+00');
INSERT INTO public.legal_documents (id, document_type, version_label, content_hash, document_url, published_at, active_from, retired_at, created_at) VALUES ('4d979a9b-8384-4394-83f8-a082b1a404eb', 'PRIVACY', 'BETA-PLACEHOLDER-v1', '57c6817f997b94aae356775eb6eef466877345b2aec5676cf22ca6bf02638475', NULL, '2026-09-11 17:53:41.895688+00', '2026-09-11 17:53:41.895688+00', NULL, '2026-09-11 17:53:41.895688+00');
INSERT INTO public.legal_documents (id, document_type, version_label, content_hash, document_url, published_at, active_from, retired_at, created_at) VALUES ('598326fe-6533-4d09-bd64-583f1ae8e187', 'CONTACT_VISIBILITY', 'BETA-PLACEHOLDER-v1', '35faed0ac6e1a987574e52ad434ce1c998e3d24ff73a78a4f9fba1670349eb40', NULL, '2026-09-11 17:53:41.895688+00', '2026-09-11 17:53:41.895688+00', NULL, '2026-09-11 17:53:41.895688+00');
INSERT INTO public.niches (id, slug, name, sort_order, is_active, created_at, updated_at) VALUES ('6563ee2c-acf8-4157-96e4-19fa3b7ddf3a', 'beleza', 'Beleza', 10, false, '2026-09-11 17:53:41.895688+00', '2026-09-11 17:53:41.974355+00');
INSERT INTO public.niches (id, slug, name, sort_order, is_active, created_at, updated_at) VALUES ('c6fcbf7e-d89c-4fc3-9a5b-e2c2951af34c', 'gastronomia', 'Gastronomia', 20, false, '2026-09-11 17:53:41.895688+00', '2026-09-11 17:53:41.974355+00');
INSERT INTO public.niches (id, slug, name, sort_order, is_active, created_at, updated_at) VALUES ('242868e4-87ec-4ccf-811f-6698e111ff64', 'moda', 'Moda', 30, false, '2026-09-11 17:53:41.895688+00', '2026-09-11 17:53:41.974355+00');
INSERT INTO public.niches (id, slug, name, sort_order, is_active, created_at, updated_at) VALUES ('e2c4a440-dc57-4a88-8b64-68ff9164cf00', 'tecnologia', 'Tecnologia', 40, false, '2026-09-11 17:53:41.895688+00', '2026-09-11 17:53:41.974355+00');
INSERT INTO public.niches (id, slug, name, sort_order, is_active, created_at, updated_at) VALUES ('5ffd850a-4704-452c-92e4-d447c8a84d76', 'viagem', 'Viagem', 50, false, '2026-09-11 17:53:41.895688+00', '2026-09-11 17:53:41.974355+00');
INSERT INTO public.niches (id, slug, name, sort_order, is_active, created_at, updated_at) VALUES ('8c177707-befb-4412-92a4-a127f84b55b4', 'lifestyle-e-rotina', 'Lifestyle e rotina', 10, true, '2026-09-11 17:53:41.974355+00', '2026-09-11 17:53:41.974355+00');
INSERT INTO public.niches (id, slug, name, sort_order, is_active, created_at, updated_at) VALUES ('0be6d81c-a20f-4473-8ca3-d3983e2c2ba6', 'moda-e-estilo', 'Moda e estilo', 20, true, '2026-09-11 17:53:41.974355+00', '2026-09-11 17:53:41.974355+00');
INSERT INTO public.niches (id, slug, name, sort_order, is_active, created_at, updated_at) VALUES ('839c3777-0953-4bec-801d-3a271d7aba0a', 'beleza-maquiagem-e-cuidados-pessoais', 'Beleza, maquiagem e cuidados pessoais', 30, true, '2026-09-11 17:53:41.974355+00', '2026-09-11 17:53:41.974355+00');
INSERT INTO public.niches (id, slug, name, sort_order, is_active, created_at, updated_at) VALUES ('f120d1d1-b8a0-45b6-90b0-18377ce804b0', 'saude-nutricao-e-bem-estar', 'Saúde, nutrição e bem-estar', 40, true, '2026-09-11 17:53:41.974355+00', '2026-09-11 17:53:41.974355+00');
INSERT INTO public.niches (id, slug, name, sort_order, is_active, created_at, updated_at) VALUES ('bc268007-a864-4a8a-8b8b-73f024487586', 'fitness-esportes-e-atividade-fisica', 'Fitness, esportes e atividade física', 50, true, '2026-09-11 17:53:41.974355+00', '2026-09-11 17:53:41.974355+00');
INSERT INTO public.niches (id, slug, name, sort_order, is_active, created_at, updated_at) VALUES ('2315c29c-8065-49e6-ab5e-877e34394c7e', 'maternidade-paternidade-e-familia', 'Maternidade, paternidade e família', 60, true, '2026-09-11 17:53:41.974355+00', '2026-09-11 17:53:41.974355+00');
INSERT INTO public.niches (id, slug, name, sort_order, is_active, created_at, updated_at) VALUES ('5eb9558c-b40b-4b20-bf70-50666cee677c', 'infantil-e-conteudo-para-criancas', 'Infantil e conteúdo para crianças', 70, true, '2026-09-11 17:53:41.974355+00', '2026-09-11 17:53:41.974355+00');
INSERT INTO public.niches (id, slug, name, sort_order, is_active, created_at, updated_at) VALUES ('1f8b58e9-fb4b-4e3e-b23f-e1d7061840d7', 'gastronomia-e-culinaria', 'Gastronomia e culinária', 80, true, '2026-09-11 17:53:41.974355+00', '2026-09-11 17:53:41.974355+00');
INSERT INTO public.niches (id, slug, name, sort_order, is_active, created_at, updated_at) VALUES ('e9114dc4-0ccd-47f9-940b-ba64db42c2b9', 'viagens-e-turismo', 'Viagens e turismo', 90, true, '2026-09-11 17:53:41.974355+00', '2026-09-11 17:53:41.974355+00');
INSERT INTO public.niches (id, slug, name, sort_order, is_active, created_at, updated_at) VALUES ('21cc0c01-f582-43cb-a854-59d69d64c081', 'casa-decoracao-e-organizacao', 'Casa, decoração e organização', 100, true, '2026-09-11 17:53:41.974355+00', '2026-09-11 17:53:41.974355+00');
INSERT INTO public.niches (id, slug, name, sort_order, is_active, created_at, updated_at) VALUES ('02418924-5701-47ab-aa61-3ee59d7961e7', 'financas-investimentos-e-empreendedorismo', 'Finanças, investimentos e empreendedorismo', 110, true, '2026-09-11 17:53:41.974355+00', '2026-09-11 17:53:41.974355+00');
INSERT INTO public.niches (id, slug, name, sort_order, is_active, created_at, updated_at) VALUES ('2cb5a51c-8208-4ffb-b561-2d38e0231ca5', 'tecnologia-games-e-inovacao', 'Tecnologia, games e inovação', 120, true, '2026-09-11 17:53:41.974355+00', '2026-09-11 17:53:41.974355+00');
INSERT INTO public.niches (id, slug, name, sort_order, is_active, created_at, updated_at) VALUES ('e5874587-192f-446d-9daa-a8e6f7ed2492', 'educacao-carreira-e-desenvolvimento-pessoal', 'Educação, carreira e desenvolvimento pessoal', 130, true, '2026-09-11 17:53:41.974355+00', '2026-09-11 17:53:41.974355+00');
INSERT INTO public.niches (id, slug, name, sort_order, is_active, created_at, updated_at) VALUES ('5bf2f98c-2482-48a7-9998-10e427c842fc', 'humor-e-entretenimento', 'Humor e entretenimento', 140, true, '2026-09-11 17:53:41.974355+00', '2026-09-11 17:53:41.974355+00');
INSERT INTO public.niches (id, slug, name, sort_order, is_active, created_at, updated_at) VALUES ('3b3f736c-13db-4732-bbe5-792c209ae976', 'musica-arte-e-cultura', 'Música, arte e cultura', 150, true, '2026-09-11 17:53:41.974355+00', '2026-09-11 17:53:41.974355+00');
INSERT INTO public.niches (id, slug, name, sort_order, is_active, created_at, updated_at) VALUES ('980416c0-b5cc-4286-ac14-e0b7995302f9', 'pets-e-animais', 'Pets e animais', 160, true, '2026-09-11 17:53:41.974355+00', '2026-09-11 17:53:41.974355+00');
INSERT INTO public.niches (id, slug, name, sort_order, is_active, created_at, updated_at) VALUES ('0ec0f524-5c2c-4405-b353-33e03327f605', 'sustentabilidade-e-consumo-consciente', 'Sustentabilidade e consumo consciente', 170, true, '2026-09-11 17:53:41.974355+00', '2026-09-11 17:53:41.974355+00');
INSERT INTO public.niches (id, slug, name, sort_order, is_active, created_at, updated_at) VALUES ('fa38e8a9-32aa-4ffc-89b8-46099fd361a5', 'relacionamentos-e-sexualidade', 'Relacionamentos e sexualidade', 180, true, '2026-09-11 17:53:41.974355+00', '2026-09-11 17:53:41.974355+00');
INSERT INTO public.niches (id, slug, name, sort_order, is_active, created_at, updated_at) VALUES ('722c748b-895b-4257-b0af-727816a555c8', 'conteudo-adulto', 'Conteúdo adulto', 190, true, '2026-09-11 17:53:41.974355+00', '2026-09-11 17:53:41.974355+00');
INSERT INTO public.niches (id, slug, name, sort_order, is_active, created_at, updated_at) VALUES ('d91f36b8-5778-4515-9e47-3f0636206414', 'comunidades-e-causas-sociais', 'Comunidades e causas sociais', 200, true, '2026-09-11 17:53:41.974355+00', '2026-09-11 17:53:41.974355+00');
INSERT INTO public.niches (id, slug, name, sort_order, is_active, created_at, updated_at) VALUES ('5fa1d73e-6142-451c-b6f2-133105501f29', 'marketing-publicidade-e-redes-sociais', 'Marketing, publicidade e redes sociais', 210, true, '2026-09-11 17:53:41.974355+00', '2026-09-11 17:53:41.974355+00');

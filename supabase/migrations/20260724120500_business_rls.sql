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
grant usage on schema public to contente_app_user;
grant usage on schema extensions to contente_app_user;

revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public
  revoke all on tables from anon, authenticated;

grant select on public.legal_documents to anon, authenticated;

grant select on all tables in schema public to contente_app_user;
grant update on public.accounts to contente_app_user;
grant insert, update on public.creator_profiles to contente_app_user;
grant insert, update on public.company_profiles to contente_app_user;
grant insert, update on public.company_locations to contente_app_user;
grant insert, update on public.niches to contente_app_user;
grant insert on public.creator_niches to contente_app_user;
grant insert, update on public.social_profiles to contente_app_user;
grant insert on public.creator_metric_snapshots to contente_app_user;
grant insert, update on public.media_assets to contente_app_user;
grant update on public.moderation_cases to contente_app_user;
grant insert, update on public.sponsorship_placements to contente_app_user;
grant update on public.email_outbox to contente_app_user;
grant insert, update on public.legal_documents to contente_app_user;
grant insert on public.account_consents to contente_app_user;
grant insert, update on public.account_contact_preferences to contente_app_user;
grant insert, update on public.blocked_identities to contente_app_user;

create or replace function public.app_current_auth_user_id()
returns uuid
language plpgsql
stable
security invoker
set search_path = ''
as $$
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

create or replace function public.app_current_account_id()
returns uuid
language plpgsql
stable
security invoker
set search_path = ''
as $$
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

create or replace function public.app_current_role()
returns public.account_role
language plpgsql
stable
security invoker
set search_path = ''
as $$
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

create or replace function public.app_current_status()
returns public.account_status
language plpgsql
stable
security invoker
set search_path = ''
as $$
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

create or replace function public.app_context_is_verified()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
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

create or replace function public.app_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.app_context_is_verified()
    and public.app_current_role() = 'ADMIN'
    and public.app_current_status() = 'APPROVED';
$$;

create or replace function public.app_is_approved_viewer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.app_context_is_verified()
    and public.app_current_role() in ('INFLUENCER', 'COMPANY')
    and public.app_current_status() = 'APPROVED';
$$;

create or replace function public.app_can_edit_own_profile()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.app_context_is_verified()
    and public.app_current_role() in ('INFLUENCER', 'COMPANY')
    and public.app_current_status() in (
      'ONBOARDING',
      'CHANGES_REQUESTED',
      'APPROVED'
    );
$$;

create or replace function public.app_account_is_approved(target_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.accounts account
    where account.id = target_account_id
      and account.status = 'APPROVED'
      and account.archived_at is null
  );
$$;

create or replace function public.app_account_role(target_account_id uuid)
returns public.account_role
language sql
stable
security definer
set search_path = ''
as $$
  select account.role
  from public.accounts account
  where account.id = target_account_id
    and account.archived_at is null;
$$;

create or replace function public.app_creator_profile_is_owned(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.creator_profiles profile
    where profile.id = target_profile_id
      and profile.account_id = public.app_current_account_id()
  );
$$;

create or replace function public.app_creator_profile_is_approved(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
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

create or replace function public.app_company_profile_is_owned(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_profiles profile
    where profile.id = target_profile_id
      and profile.account_id = public.app_current_account_id()
  );
$$;

create or replace function public.app_moderation_case_is_owned(target_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.moderation_cases moderation_case
    where moderation_case.id = target_case_id
      and moderation_case.account_id = public.app_current_account_id()
  );
$$;

revoke all on function public.app_current_auth_user_id() from public;
revoke all on function public.app_current_account_id() from public;
revoke all on function public.app_current_role() from public;
revoke all on function public.app_current_status() from public;
revoke all on function public.app_context_is_verified() from public;
revoke all on function public.app_is_admin() from public;
revoke all on function public.app_is_approved_viewer() from public;
revoke all on function public.app_can_edit_own_profile() from public;
revoke all on function public.app_account_is_approved(uuid) from public;
revoke all on function public.app_account_role(uuid) from public;
revoke all on function public.app_creator_profile_is_owned(uuid) from public;
revoke all on function public.app_creator_profile_is_approved(uuid) from public;
revoke all on function public.app_company_profile_is_owned(uuid) from public;
revoke all on function public.app_moderation_case_is_owned(uuid) from public;

grant execute on function public.app_current_auth_user_id() to contente_app_user;
grant execute on function public.app_current_account_id() to contente_app_user;
grant execute on function public.app_current_role() to contente_app_user;
grant execute on function public.app_current_status() to contente_app_user;
grant execute on function public.app_context_is_verified() to contente_app_user;
grant execute on function public.app_is_admin() to contente_app_user;
grant execute on function public.app_is_approved_viewer() to contente_app_user;
grant execute on function public.app_can_edit_own_profile() to contente_app_user;
grant execute on function public.app_account_is_approved(uuid) to contente_app_user;
grant execute on function public.app_account_role(uuid) to contente_app_user;
grant execute on function public.app_creator_profile_is_owned(uuid) to contente_app_user;
grant execute on function public.app_creator_profile_is_approved(uuid) to contente_app_user;
grant execute on function public.app_company_profile_is_owned(uuid) to contente_app_user;
grant execute on function public.app_moderation_case_is_owned(uuid) to contente_app_user;

alter table public.accounts enable row level security;
alter table public.accounts force row level security;
alter table public.creator_profiles enable row level security;
alter table public.creator_profiles force row level security;
alter table public.company_profiles enable row level security;
alter table public.company_profiles force row level security;
alter table public.company_locations enable row level security;
alter table public.company_locations force row level security;
alter table public.niches enable row level security;
alter table public.niches force row level security;
alter table public.creator_niches enable row level security;
alter table public.creator_niches force row level security;
alter table public.social_profiles enable row level security;
alter table public.social_profiles force row level security;
alter table public.creator_metric_snapshots enable row level security;
alter table public.creator_metric_snapshots force row level security;
alter table public.media_assets enable row level security;
alter table public.media_assets force row level security;
alter table public.moderation_cases enable row level security;
alter table public.moderation_cases force row level security;
alter table public.moderation_events enable row level security;
alter table public.moderation_events force row level security;
alter table public.sponsorship_placements enable row level security;
alter table public.sponsorship_placements force row level security;
alter table public.email_outbox enable row level security;
alter table public.email_outbox force row level security;
alter table public.email_attempts enable row level security;
alter table public.email_attempts force row level security;
alter table public.legal_documents enable row level security;
alter table public.legal_documents force row level security;
alter table public.account_consents enable row level security;
alter table public.account_consents force row level security;
alter table public.account_contact_preferences enable row level security;
alter table public.account_contact_preferences force row level security;
alter table public.blocked_identities enable row level security;
alter table public.blocked_identities force row level security;
alter table public.audit_revisions enable row level security;
alter table public.audit_revisions force row level security;

create policy accounts_select_policy
on public.accounts
for select
to contente_app_user
using (
  public.app_context_is_verified()
  and (
    id = public.app_current_account_id()
    or public.app_is_admin()
    or (
      public.app_is_approved_viewer()
      and status = 'APPROVED'
      and archived_at is null
      and (
        (
          public.app_current_role() = 'COMPANY'
          and role = 'INFLUENCER'
        )
        or public.app_current_role() = 'INFLUENCER'
      )
    )
  )
);

create policy accounts_admin_update_policy
on public.accounts
for update
to contente_app_user
using (public.app_is_admin())
with check (public.app_is_admin());

create policy creator_profiles_select_policy
on public.creator_profiles
for select
to contente_app_user
using (
  public.app_context_is_verified()
  and (
    account_id = public.app_current_account_id()
    or public.app_is_admin()
    or (
      public.app_is_approved_viewer()
      and archived_at is null
      and public.app_account_is_approved(account_id)
    )
  )
);

create policy creator_profiles_insert_policy
on public.creator_profiles
for insert
to contente_app_user
with check (
  public.app_is_admin()
  or (
    public.app_can_edit_own_profile()
    and public.app_current_role() = 'INFLUENCER'
    and account_id = public.app_current_account_id()
  )
);

create policy creator_profiles_update_policy
on public.creator_profiles
for update
to contente_app_user
using (
  public.app_is_admin()
  or (
    public.app_can_edit_own_profile()
    and public.app_current_role() = 'INFLUENCER'
    and account_id = public.app_current_account_id()
  )
)
with check (
  public.app_is_admin()
  or (
    public.app_can_edit_own_profile()
    and public.app_current_role() = 'INFLUENCER'
    and account_id = public.app_current_account_id()
  )
);

create policy company_profiles_select_policy
on public.company_profiles
for select
to contente_app_user
using (
  public.app_context_is_verified()
  and (
    account_id = public.app_current_account_id()
    or public.app_is_admin()
    or (
      public.app_is_approved_viewer()
      and public.app_current_role() = 'INFLUENCER'
      and archived_at is null
      and public.app_account_is_approved(account_id)
    )
  )
);

create policy company_profiles_insert_policy
on public.company_profiles
for insert
to contente_app_user
with check (
  public.app_is_admin()
  or (
    public.app_can_edit_own_profile()
    and public.app_current_role() = 'COMPANY'
    and account_id = public.app_current_account_id()
  )
);

create policy company_profiles_update_policy
on public.company_profiles
for update
to contente_app_user
using (
  public.app_is_admin()
  or (
    public.app_can_edit_own_profile()
    and public.app_current_role() = 'COMPANY'
    and account_id = public.app_current_account_id()
  )
)
with check (
  public.app_is_admin()
  or (
    public.app_can_edit_own_profile()
    and public.app_current_role() = 'COMPANY'
    and account_id = public.app_current_account_id()
  )
);

create policy company_locations_select_policy
on public.company_locations
for select
to contente_app_user
using (
  public.app_is_admin()
  or public.app_company_profile_is_owned(company_profile_id)
);

create policy company_locations_insert_policy
on public.company_locations
for insert
to contente_app_user
with check (
  public.app_is_admin()
  or (
    public.app_can_edit_own_profile()
    and public.app_current_role() = 'COMPANY'
    and public.app_company_profile_is_owned(company_profile_id)
  )
);

create policy company_locations_update_policy
on public.company_locations
for update
to contente_app_user
using (
  public.app_is_admin()
  or (
    public.app_can_edit_own_profile()
    and public.app_current_role() = 'COMPANY'
    and public.app_company_profile_is_owned(company_profile_id)
  )
)
with check (
  public.app_is_admin()
  or (
    public.app_can_edit_own_profile()
    and public.app_current_role() = 'COMPANY'
    and public.app_company_profile_is_owned(company_profile_id)
  )
);

create policy niches_select_policy
on public.niches
for select
to contente_app_user
using (
  public.app_context_is_verified()
  and (
    public.app_is_admin()
    or public.app_current_status() in (
      'ONBOARDING',
      'PENDING_REVIEW',
      'CHANGES_REQUESTED',
      'APPROVED'
    )
  )
);

create policy niches_admin_insert_policy
on public.niches
for insert
to contente_app_user
with check (public.app_is_admin());

create policy niches_admin_update_policy
on public.niches
for update
to contente_app_user
using (public.app_is_admin())
with check (public.app_is_admin());

create policy creator_niches_select_policy
on public.creator_niches
for select
to contente_app_user
using (
  public.app_is_admin()
  or public.app_creator_profile_is_owned(creator_profile_id)
  or (
    public.app_is_approved_viewer()
    and public.app_creator_profile_is_approved(creator_profile_id)
  )
);

create policy creator_niches_insert_policy
on public.creator_niches
for insert
to contente_app_user
with check (
  public.app_is_admin()
  or (
    public.app_can_edit_own_profile()
    and public.app_current_role() = 'INFLUENCER'
    and public.app_creator_profile_is_owned(creator_profile_id)
  )
);

create policy social_profiles_select_policy
on public.social_profiles
for select
to contente_app_user
using (
  public.app_is_admin()
  or owner_account_id = public.app_current_account_id()
  or (
    public.app_is_approved_viewer()
    and archived_at is null
    and is_visible_in_catalog
    and public.app_account_is_approved(owner_account_id)
    and public.app_account_role(owner_account_id) = 'INFLUENCER'
  )
);

create policy social_profiles_insert_policy
on public.social_profiles
for insert
to contente_app_user
with check (
  public.app_is_admin()
  or (
    public.app_can_edit_own_profile()
    and owner_account_id = public.app_current_account_id()
  )
);

create policy social_profiles_update_policy
on public.social_profiles
for update
to contente_app_user
using (
  public.app_is_admin()
  or (
    public.app_can_edit_own_profile()
    and owner_account_id = public.app_current_account_id()
  )
)
with check (
  public.app_is_admin()
  or (
    public.app_can_edit_own_profile()
    and owner_account_id = public.app_current_account_id()
  )
);

create policy creator_metric_snapshots_select_policy
on public.creator_metric_snapshots
for select
to contente_app_user
using (
  public.app_is_admin()
  or public.app_creator_profile_is_owned(creator_profile_id)
  or (
    public.app_is_approved_viewer()
    and public.app_creator_profile_is_approved(creator_profile_id)
  )
);

create policy creator_metric_snapshots_insert_policy
on public.creator_metric_snapshots
for insert
to contente_app_user
with check (
  public.app_is_admin()
  or (
    public.app_can_edit_own_profile()
    and public.app_current_role() = 'INFLUENCER'
    and public.app_creator_profile_is_owned(creator_profile_id)
  )
);

create policy media_assets_select_policy
on public.media_assets
for select
to contente_app_user
using (
  public.app_is_admin()
  or owner_account_id = public.app_current_account_id()
  or (
    public.app_is_approved_viewer()
    and status = 'ACTIVE'
    and archived_at is null
    and public.app_account_is_approved(owner_account_id)
    and (
      (
        public.app_account_role(owner_account_id) = 'INFLUENCER'
        and kind in ('AVATAR', 'COVER')
      )
      or (
        public.app_current_role() = 'INFLUENCER'
        and public.app_account_role(owner_account_id) = 'COMPANY'
        and kind = 'LOGO'
      )
    )
  )
);

create policy media_assets_insert_policy
on public.media_assets
for insert
to contente_app_user
with check (
  public.app_is_admin()
  or (
    public.app_can_edit_own_profile()
    and owner_account_id = public.app_current_account_id()
    and kind <> 'SPONSORSHIP_CREATIVE'
  )
);

create policy media_assets_update_policy
on public.media_assets
for update
to contente_app_user
using (
  public.app_is_admin()
  or (
    public.app_can_edit_own_profile()
    and owner_account_id = public.app_current_account_id()
    and kind <> 'SPONSORSHIP_CREATIVE'
  )
)
with check (
  public.app_is_admin()
  or (
    public.app_can_edit_own_profile()
    and owner_account_id = public.app_current_account_id()
    and kind <> 'SPONSORSHIP_CREATIVE'
  )
);

create policy moderation_cases_select_policy
on public.moderation_cases
for select
to contente_app_user
using (
  public.app_is_admin()
  or (
    public.app_context_is_verified()
    and public.app_current_status() <> 'BANNED'
    and account_id = public.app_current_account_id()
  )
);

create policy moderation_cases_admin_update_policy
on public.moderation_cases
for update
to contente_app_user
using (public.app_is_admin())
with check (public.app_is_admin());

create policy moderation_events_select_policy
on public.moderation_events
for select
to contente_app_user
using (
  public.app_is_admin()
  or (
    public.app_context_is_verified()
    and public.app_current_status() <> 'BANNED'
    and public.app_moderation_case_is_owned(moderation_case_id)
  )
);

create policy sponsorship_placements_select_policy
on public.sponsorship_placements
for select
to contente_app_user
using (
  public.app_is_admin()
  or (
    public.app_is_approved_viewer()
    and is_active
    and archived_at is null
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
    and (
      audience = 'ALL'
      or audience::text = public.app_current_role()::text
    )
  )
);

create policy sponsorship_placements_admin_insert_policy
on public.sponsorship_placements
for insert
to contente_app_user
with check (public.app_is_admin());

create policy sponsorship_placements_admin_update_policy
on public.sponsorship_placements
for update
to contente_app_user
using (public.app_is_admin())
with check (public.app_is_admin());

create policy email_outbox_admin_select_policy
on public.email_outbox
for select
to contente_app_user
using (public.app_is_admin());

create policy email_outbox_admin_update_policy
on public.email_outbox
for update
to contente_app_user
using (public.app_is_admin())
with check (public.app_is_admin());

create policy email_attempts_admin_select_policy
on public.email_attempts
for select
to contente_app_user
using (public.app_is_admin());

create policy legal_documents_public_select_policy
on public.legal_documents
for select
to anon, authenticated
using (
  retired_at is null
  and active_from <= now()
);

create policy legal_documents_app_select_policy
on public.legal_documents
for select
to contente_app_user
using (
  public.app_is_admin()
  or (
    public.app_context_is_verified()
    and public.app_current_status() <> 'BANNED'
    and retired_at is null
    and active_from <= now()
  )
);

create policy legal_documents_admin_insert_policy
on public.legal_documents
for insert
to contente_app_user
with check (public.app_is_admin());

create policy legal_documents_admin_update_policy
on public.legal_documents
for update
to contente_app_user
using (public.app_is_admin())
with check (public.app_is_admin());

create policy account_consents_select_policy
on public.account_consents
for select
to contente_app_user
using (
  public.app_is_admin()
  or (
    public.app_context_is_verified()
    and account_id = public.app_current_account_id()
  )
);

create policy account_consents_insert_policy
on public.account_consents
for insert
to contente_app_user
with check (
  public.app_is_admin()
  or (
    public.app_can_edit_own_profile()
    and account_id = public.app_current_account_id()
  )
);

create policy account_contact_preferences_select_policy
on public.account_contact_preferences
for select
to contente_app_user
using (
  public.app_is_admin()
  or account_id = public.app_current_account_id()
  or (
    public.app_is_approved_viewer()
    and public.app_current_role() = 'COMPANY'
    and archived_at is null
    and public.app_account_is_approved(account_id)
    and public.app_account_role(account_id) = 'INFLUENCER'
  )
);

create policy account_contact_preferences_insert_policy
on public.account_contact_preferences
for insert
to contente_app_user
with check (
  public.app_is_admin()
  or (
    public.app_can_edit_own_profile()
    and public.app_current_role() = 'INFLUENCER'
    and account_id = public.app_current_account_id()
  )
);

create policy account_contact_preferences_update_policy
on public.account_contact_preferences
for update
to contente_app_user
using (
  public.app_is_admin()
  or (
    public.app_can_edit_own_profile()
    and public.app_current_role() = 'INFLUENCER'
    and account_id = public.app_current_account_id()
  )
)
with check (
  public.app_is_admin()
  or (
    public.app_can_edit_own_profile()
    and public.app_current_role() = 'INFLUENCER'
    and account_id = public.app_current_account_id()
  )
);

create policy blocked_identities_admin_select_policy
on public.blocked_identities
for select
to contente_app_user
using (public.app_is_admin());

create policy blocked_identities_admin_insert_policy
on public.blocked_identities
for insert
to contente_app_user
with check (public.app_is_admin());

create policy blocked_identities_admin_update_policy
on public.blocked_identities
for update
to contente_app_user
using (public.app_is_admin())
with check (public.app_is_admin());

create policy audit_revisions_admin_select_policy
on public.audit_revisions
for select
to contente_app_user
using (public.app_is_admin());

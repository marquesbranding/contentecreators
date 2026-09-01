-- Tracks when a COMPANY clicks "Chamar no WhatsApp" on a creator's profile,
-- so the app can ask them (next visit) whether they actually reached out.
-- A confirmed contact bumps a denormalized counter on the creator's profile,
-- shown as a badge on catalog cards and the detail page.

alter table public.creator_profiles
  add column whatsapp_contact_count integer not null default 0;

alter table public.creator_profiles
  add constraint creator_profiles_whatsapp_contact_count_check
    check (whatsapp_contact_count >= 0);

create type public.whatsapp_contact_status as enum (
  'PENDING',
  'CONFIRMED'
);

create table public.whatsapp_contact_confirmations (
  id uuid primary key default gen_random_uuid(),
  company_account_id uuid not null references public.accounts(id) on delete restrict,
  creator_profile_id uuid not null references public.creator_profiles(id) on delete restrict,
  status public.whatsapp_contact_status not null default 'PENDING',
  clicked_at timestamptz not null default now(),
  confirmed_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_contact_confirmations_version_check check (version > 0),
  constraint whatsapp_contact_confirmations_state_check check (
    (status = 'PENDING' and confirmed_at is null)
    or
    (status = 'CONFIRMED' and confirmed_at is not null)
  )
);

-- At most one open ("did you actually contact them?") question per
-- company/creator pair; repeated clicks before it's answered just bump
-- clicked_at instead of piling up duplicate questions.
create unique index whatsapp_contact_confirmations_pending_uidx
  on public.whatsapp_contact_confirmations (company_account_id, creator_profile_id)
  where status = 'PENDING';
create index whatsapp_contact_confirmations_company_queue_idx
  on public.whatsapp_contact_confirmations (company_account_id, status, clicked_at);

create trigger whatsapp_contact_confirmations_updated_at_version_trigger
before update on public.whatsapp_contact_confirmations
for each row execute function public.set_updated_at_and_version();

create trigger whatsapp_contact_confirmations_audit_revision_trigger
after insert or update or delete on public.whatsapp_contact_confirmations
for each row execute function public.capture_audit_revision();

alter table public.whatsapp_contact_confirmations enable row level security;
alter table public.whatsapp_contact_confirmations force row level security;

grant select on public.whatsapp_contact_confirmations to contente_app_user;

create policy whatsapp_contact_confirmations_company_select_policy
on public.whatsapp_contact_confirmations
for select
to contente_app_user
using (company_account_id = public.app_current_account_id());

-- Records (or refreshes) the pending question for one company/creator pair.
-- Runs as the caller clicks "Chamar no WhatsApp" — before the WhatsApp link
-- actually opens in a new tab, so this never blocks that navigation.
create or replace function public.app_record_whatsapp_contact_click(
  target_creator_profile_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
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

-- Applies the company's "sim, chamei" answer: marks the confirmation and
-- bumps the creator's counter once. Idempotent — confirming an
-- already-confirmed row just returns the current count.
create or replace function public.app_confirm_whatsapp_contact(
  confirmation_id uuid
)
returns table (
  creator_profile_id uuid,
  whatsapp_contact_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
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
  set whatsapp_contact_count = whatsapp_contact_count + 1
  where id = current_confirmation.creator_profile_id
  returning whatsapp_contact_count into updated_count;

  return query
    select current_confirmation.creator_profile_id, updated_count;
end;
$$;

revoke all on function public.app_record_whatsapp_contact_click(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.app_confirm_whatsapp_contact(uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.app_record_whatsapp_contact_click(uuid)
  to contente_app_user;
grant execute on function public.app_confirm_whatsapp_contact(uuid)
  to contente_app_user;

create table public.onboarding_drafts (
  account_id uuid primary key references public.accounts(id) on delete restrict,
  role public.account_role not null,
  payload jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint onboarding_drafts_role_check
    check (role in ('INFLUENCER', 'COMPANY')),
  constraint onboarding_drafts_payload_check
    check (
      jsonb_typeof(payload) = 'object'
      and octet_length(payload::text) <= 50000
    ),
  constraint onboarding_drafts_version_check check (version > 0)
);
create index onboarding_drafts_updated_at_idx
  on public.onboarding_drafts (updated_at, account_id);

create trigger onboarding_drafts_updated_at_version_trigger
before update on public.onboarding_drafts
for each row execute function public.set_updated_at_and_version();

revoke all on public.onboarding_drafts from anon, authenticated;
grant select, insert, update on public.onboarding_drafts to contente_app_user;

alter table public.onboarding_drafts enable row level security;
alter table public.onboarding_drafts force row level security;

create policy onboarding_drafts_owner_select_policy
on public.onboarding_drafts
for select
to contente_app_user
using (
  public.app_context_is_verified()
  and account_id = public.app_current_account_id()
  and role = public.app_current_role()
  and public.app_current_role() in ('INFLUENCER', 'COMPANY')
  and public.app_current_status() in ('ONBOARDING', 'CHANGES_REQUESTED')
);

create policy onboarding_drafts_owner_insert_policy
on public.onboarding_drafts
for insert
to contente_app_user
with check (
  public.app_context_is_verified()
  and account_id = public.app_current_account_id()
  and role = public.app_current_role()
  and public.app_current_role() in ('INFLUENCER', 'COMPANY')
  and public.app_current_status() in ('ONBOARDING', 'CHANGES_REQUESTED')
);

create policy onboarding_drafts_owner_update_policy
on public.onboarding_drafts
for update
to contente_app_user
using (
  public.app_context_is_verified()
  and account_id = public.app_current_account_id()
  and role = public.app_current_role()
  and public.app_current_role() in ('INFLUENCER', 'COMPANY')
  and public.app_current_status() in ('ONBOARDING', 'CHANGES_REQUESTED')
)
with check (
  public.app_context_is_verified()
  and account_id = public.app_current_account_id()
  and role = public.app_current_role()
  and public.app_current_role() in ('INFLUENCER', 'COMPANY')
  and public.app_current_status() in ('ONBOARDING', 'CHANGES_REQUESTED')
);

-- Same gap as the previous migration, one layer deeper: the unified catalog
-- directory's query joins company_profiles to accounts directly, so even
-- with company_profiles readable, accounts_select_policy still hid every
-- other COMPANY row from a COMPANY viewer (it only ever allowed the
-- INFLUENCER target role for that branch, from the old creator-only company
-- carousel). Add COMPANY as an allowed target role for a COMPANY viewer;
-- ADMIN stays excluded, matching the existing intent of this branch.
drop policy accounts_select_policy on public.accounts;

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
          and role in ('INFLUENCER', 'COMPANY')
        )
        or public.app_current_role() = 'INFLUENCER'
      )
    )
  )
);

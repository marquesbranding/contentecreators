-- The unified catalog directory lets an approved COMPANY viewer browse other
-- companies mixed in with creators, but this policy predates that feature:
-- it only let an INFLUENCER viewer read someone else's company profile (a
-- holdover from the old creator-only company carousel). As a result, an
-- approved company saw every other creator in the directory but zero other
-- companies. Mirrors creator_profiles_select_policy, which already grants
-- read access to any approved viewer regardless of role.
drop policy company_profiles_select_policy on public.company_profiles;

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
      and archived_at is null
      and public.app_account_is_approved(account_id)
    )
  )
);

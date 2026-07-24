grant delete on public.creator_niches to contente_app_user;
grant update on public.creator_metric_snapshots to contente_app_user;

create policy creator_niches_delete_policy
on public.creator_niches
for delete
to contente_app_user
using (
  public.app_is_admin()
  or (
    public.app_can_edit_own_profile()
    and public.app_current_role() = 'INFLUENCER'
    and public.app_creator_profile_is_owned(creator_profile_id)
  )
);

create policy creator_metric_snapshots_update_policy
on public.creator_metric_snapshots
for update
to contente_app_user
using (
  public.app_is_admin()
  or (
    public.app_can_edit_own_profile()
    and public.app_current_role() = 'INFLUENCER'
    and public.app_creator_profile_is_owned(creator_profile_id)
  )
)
with check (
  public.app_is_admin()
  or (
    public.app_can_edit_own_profile()
    and public.app_current_role() = 'INFLUENCER'
    and public.app_creator_profile_is_owned(creator_profile_id)
  )
);

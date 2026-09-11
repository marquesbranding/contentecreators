-- An approved influencer editing their profile may pick "Outros" and type a
-- custom niche, which adds a `personalizado-*` row to public.niches. That edit
-- runs as contente_app_user, but niches only ever accepted ADMIN writes, so
-- the whole profile save failed with a row-level security violation.
-- (Registration was unaffected: it writes through the audited owner
-- connection, outside RLS.)
--
-- Allow exactly that row shape, for the same actors that may already link
-- niches to their own creator profile (creator_niches_insert_policy). Updates
-- stay admin-only: the application inserts with ON CONFLICT DO NOTHING, so a
-- creator can never rename or reactivate a niche someone else created.
create policy niches_creator_custom_insert_policy
on public.niches
for insert
to contente_app_user
with check (
  public.app_can_edit_own_profile()
  and public.app_current_role() = 'INFLUENCER'
  and slug like 'personalizado-%'
  and sort_order = 1000
  and is_active
);

create index creator_profiles_display_name_active_idx
  on public.creator_profiles (display_name, id)
  where archived_at is null;

create index creator_profiles_location_active_idx
  on public.creator_profiles (state, city, display_name, id)
  where archived_at is null;

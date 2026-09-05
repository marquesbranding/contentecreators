-- The unified catalog directory (creators + companies mixed, ordered by
-- signup date) needs a keyset-paginated `order by created_at, id` over both
-- tables. Neither had an index usable for that ordering yet.
create index creator_profiles_created_at_active_idx
  on public.creator_profiles (created_at, id)
  where archived_at is null;

create index company_profiles_created_at_active_idx
  on public.company_profiles (created_at, id)
  where archived_at is null;

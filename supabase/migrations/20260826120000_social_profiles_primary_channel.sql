alter table public.social_profiles
  add column if not exists is_primary boolean not null default false;

create unique index if not exists social_profiles_owner_primary_uidx
  on public.social_profiles (owner_account_id)
  where archived_at is null and is_primary;

with ranked_channels as (
  select
    id,
    owner_account_id,
    row_number() over (
      partition by owner_account_id
      order by sort_order, id
    ) as rank
  from public.social_profiles
  where archived_at is null
),
accounts_without_primary as (
  select owner_account_id
  from public.social_profiles
  where archived_at is null
  group by owner_account_id
  having bool_or(is_primary) = false
)
update public.social_profiles sp
set is_primary = true
from ranked_channels rc
where sp.id = rc.id
  and rc.rank = 1
  and rc.owner_account_id in (select owner_account_id from accounts_without_primary);

-- Adds two optional creative-image slots to sponsorship placements — tablet
-- and mobile variants of the existing (now "desktop") creative — so the
-- public renderer can pick the right image per viewport instead of scaling
-- one asset for every screen size. The original `creative_asset_id` column
-- stays the required "desktop" slot; activation still requires it whenever
-- any variant is present (enforced in application code, not here, since
-- drafts are allowed to be incomplete).

alter table public.sponsorship_placements
  add column creative_asset_tablet_id uuid references public.media_assets(id) on delete restrict,
  add column creative_asset_mobile_id uuid references public.media_assets(id) on delete restrict;

-- Signed-URL read authorization for the sponsorship-media bucket previously
-- only recognized the single (desktop) creative column; extend it so the
-- new tablet/mobile variants are readable under the same eligibility rules.
create or replace function public.app_storage_can_read_sponsorship_object(
  object_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with viewer as (
    select
      account.id,
      account.role,
      account.status
    from public.accounts account
    where account.auth_user_id = auth.uid()
      and account.archived_at is null
  )
  select exists (
    select 1
    from viewer
    where (
      viewer.role = 'ADMIN'::public.account_role
      and viewer.status = 'APPROVED'::public.account_status
    )
    or (
      viewer.role in (
        'INFLUENCER'::public.account_role,
        'COMPANY'::public.account_role
      )
      and viewer.status = 'APPROVED'::public.account_status
      and exists (
        select 1
        from public.media_assets media
        join public.sponsorship_placements placement
          on media.id in (
            placement.creative_asset_id,
            placement.creative_asset_tablet_id,
            placement.creative_asset_mobile_id
          )
        where media.bucket_name = 'sponsorship-media'
          and media.object_path = object_name
          and media.status = 'ACTIVE'::public.media_status
          and media.archived_at is null
          and placement.is_active
          and placement.archived_at is null
          and placement.starts_at <= now()
          and (placement.ends_at is null or placement.ends_at > now())
          and (
            placement.audience = 'ALL'::public.placement_audience
            or placement.audience::text = viewer.role::text
          )
      )
    )
  );
$$;

revoke all on function public.app_storage_can_read_sponsorship_object(text)
  from public;

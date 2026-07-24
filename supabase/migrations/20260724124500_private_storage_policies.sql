-- Private media buckets and Storage RLS. Object bytes are immutable from the
-- application perspective: replacement uploads use a new path and deletion is
-- reserved for the reviewed retention/cleanup operation.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'profile-media',
    'profile-media',
    false,
    8388608,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'sponsorship-media',
    'sponsorship-media',
    false,
    8388608,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  updated_at = now();

create or replace function public.app_storage_can_manage_profile_object(
  object_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.accounts account
    where account.auth_user_id = auth.uid()
      and account.archived_at is null
      and account.role in (
        'INFLUENCER'::public.account_role,
        'COMPANY'::public.account_role
      )
      and account.status in (
        'ONBOARDING'::public.account_status,
        'CHANGES_REQUESTED'::public.account_status,
        'APPROVED'::public.account_status
      )
      and (storage.foldername(object_name))[1] = account.id::text
  );
$$;

create or replace function public.app_storage_can_read_profile_object(
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
      viewer.status in (
        'ONBOARDING'::public.account_status,
        'PENDING_REVIEW'::public.account_status,
        'CHANGES_REQUESTED'::public.account_status,
        'APPROVED'::public.account_status
      )
      and (storage.foldername(object_name))[1] = viewer.id::text
    )
    or (
      viewer.role = 'ADMIN'::public.account_role
      and viewer.status = 'APPROVED'::public.account_status
      and exists (
        select 1
        from public.media_assets media
        where media.bucket_name = 'profile-media'
          and media.object_path = object_name
          and media.archived_at is null
      )
    )
    or (
      viewer.status = 'APPROVED'::public.account_status
      and viewer.role in (
        'INFLUENCER'::public.account_role,
        'COMPANY'::public.account_role
      )
      and exists (
        select 1
        from public.media_assets media
        join public.accounts target_account
          on target_account.id = media.owner_account_id
        where media.bucket_name = 'profile-media'
          and media.object_path = object_name
          and media.status = 'ACTIVE'::public.media_status
          and media.archived_at is null
          and target_account.status = 'APPROVED'::public.account_status
          and target_account.archived_at is null
          and (
            (
              viewer.role = 'COMPANY'::public.account_role
              and target_account.role = 'INFLUENCER'::public.account_role
            )
            or (
              viewer.role = 'INFLUENCER'::public.account_role
              and target_account.id <> viewer.id
              and target_account.role in (
                'INFLUENCER'::public.account_role,
                'COMPANY'::public.account_role
              )
            )
          )
      )
    )
  );
$$;

create or replace function public.app_storage_can_manage_sponsorship_object(
  object_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.accounts account
    where account.auth_user_id = auth.uid()
      and account.role = 'ADMIN'::public.account_role
      and account.status = 'APPROVED'::public.account_status
      and account.archived_at is null
      and (storage.foldername(object_name))[1] = account.id::text
  );
$$;

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
          on placement.creative_asset_id = media.id
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

revoke all on function public.app_storage_can_manage_profile_object(text)
  from public;
revoke all on function public.app_storage_can_read_profile_object(text)
  from public;
revoke all on function public.app_storage_can_manage_sponsorship_object(text)
  from public;
revoke all on function public.app_storage_can_read_sponsorship_object(text)
  from public;

grant execute on function public.app_storage_can_manage_profile_object(text)
  to authenticated;
grant execute on function public.app_storage_can_read_profile_object(text)
  to authenticated;
grant execute on function public.app_storage_can_manage_sponsorship_object(text)
  to authenticated;
grant execute on function public.app_storage_can_read_sponsorship_object(text)
  to authenticated;

drop policy if exists "profile media authorized read"
  on storage.objects;
create policy "profile media authorized read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-media'
  and public.app_storage_can_read_profile_object(name)
);

drop policy if exists "profile media owner immutable upload"
  on storage.objects;
create policy "profile media owner immutable upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-media'
  and (owner_id is null or owner_id = auth.uid()::text)
  and public.app_storage_can_manage_profile_object(name)
);

drop policy if exists "sponsorship media authorized read"
  on storage.objects;
create policy "sponsorship media authorized read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'sponsorship-media'
  and public.app_storage_can_read_sponsorship_object(name)
);

drop policy if exists "sponsorship media admin immutable upload"
  on storage.objects;
create policy "sponsorship media admin immutable upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'sponsorship-media'
  and (owner_id is null or owner_id = auth.uid()::text)
  and public.app_storage_can_manage_sponsorship_object(name)
);

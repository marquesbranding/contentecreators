-- Revisão 03, bloco B1: empresas aprovadas ficam visíveis no catálogo para
-- os dois papéis (commit 6e04afb), mas a policy de mídia ainda restringia
-- LOGO a viewers INFLUENCER e nunca liberava COVER de empresa para ninguém
-- além do dono/admin. Amplia para: qualquer conta aprovada vê LOGO e COVER
-- de uma empresa aprovada, no mesmo nível de exposição do perfil dela.
drop policy if exists media_assets_select_policy on public.media_assets;

create policy media_assets_select_policy on public.media_assets
  for select to contente_app_user
  using (
    public.app_is_admin()
    or owner_account_id = public.app_current_account_id()
    or (
      public.app_is_approved_viewer()
      and status = 'ACTIVE'::public.media_status
      and archived_at is null
      and public.app_account_is_approved(owner_account_id)
      and (
        (
          public.app_account_role(owner_account_id) = 'INFLUENCER'::public.account_role
          and kind = any (array['AVATAR'::public.media_kind, 'COVER'::public.media_kind])
        )
        or (
          public.app_account_role(owner_account_id) = 'COMPANY'::public.account_role
          and kind = any (array['LOGO'::public.media_kind, 'COVER'::public.media_kind])
        )
      )
    )
  );

-- Defense-in-depth mirror for direct Supabase Storage access (the app itself
-- signs URLs with the service-role client after this same authorization is
-- already proven via media_assets RLS, so this function only matters for a
-- caller hitting Storage directly with a user JWT). Previously a COMPANY
-- viewer could not read another COMPANY's object at all; align it with the
-- table policy above.
create or replace function public.app_storage_can_read_profile_object(object_name text) returns boolean
    language sql stable security definer
    set search_path to ''
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
          and target_account.id <> viewer.id
          and target_account.role in (
            'INFLUENCER'::public.account_role,
            'COMPANY'::public.account_role
          )
      )
    )
  );
$$;

alter function public.app_storage_can_read_profile_object(text) owner to postgres;

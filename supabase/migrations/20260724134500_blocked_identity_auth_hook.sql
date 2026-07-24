create or replace function public.app_identity_key_hash(raw_value text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select encode(
    extensions.digest(lower(trim(raw_value)), 'sha256'),
    'hex'
  );
$$;

create or replace function public.app_identity_subject_hash(raw_value text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select encode(
    extensions.digest(trim(raw_value), 'sha256'),
    'hex'
  );
$$;

create or replace function public.before_user_created(event jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  provider_name text := lower(
    coalesce(
      event #>> '{user,app_metadata,provider}',
      'email'
    )
  );
  provider_value public.identity_provider;
  email_value text := nullif(
    lower(trim(event #>> '{user,email}')),
    ''
  );
  email_hash text;
  provider_subject text;
  subject_hash text;
  identity_is_blocked boolean := false;
begin
  provider_value := case provider_name
    when 'email' then 'EMAIL'::public.identity_provider
    when 'google' then 'GOOGLE'::public.identity_provider
    else null
  end;

  if provider_value is null or email_value is null then
    return '{}'::jsonb;
  end if;

  email_hash := public.app_identity_key_hash(email_value);

  if provider_value = 'GOOGLE' then
    provider_subject := coalesce(
      nullif(event #>> '{user,identities,0,provider_id}', ''),
      nullif(event #>> '{user,identities,0,identity_data,sub}', ''),
      nullif(event #>> '{user,user_metadata,sub}', '')
    );

    if provider_subject is not null then
      subject_hash := public.app_identity_subject_hash(provider_subject);
    end if;
  end if;

  select exists (
    select 1
    from public.blocked_identities blocked
    where blocked.provider = provider_value
      and blocked.unblocked_at is null
      and blocked.archived_at is null
      and (
        blocked.identity_key_hash = email_hash
        or (
          provider_value = 'GOOGLE'
          and subject_hash is not null
          and blocked.provider_subject_hash = subject_hash
        )
      )
  )
  into identity_is_blocked;

  if identity_is_blocked then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code',
        403,
        'message',
        'Não foi possível criar esta conta.'
      )
    );
  end if;

  return '{}'::jsonb;
end;
$$;

grant usage on schema public, extensions to supabase_auth_admin;
grant select (
  provider,
  identity_key_hash,
  provider_subject_hash,
  unblocked_at,
  archived_at
) on public.blocked_identities to supabase_auth_admin;

drop policy if exists blocked_identities_auth_hook_select_policy
  on public.blocked_identities;
create policy blocked_identities_auth_hook_select_policy
on public.blocked_identities
for select
to supabase_auth_admin
using (
  unblocked_at is null
  and archived_at is null
);

revoke all on function public.app_identity_key_hash(text)
  from public, anon, authenticated, service_role;
revoke all on function public.app_identity_subject_hash(text)
  from public, anon, authenticated, service_role;
revoke all on function public.before_user_created(jsonb)
  from public, anon, authenticated, service_role;

grant execute on function public.app_identity_key_hash(text)
  to supabase_auth_admin, contente_app_user;
grant execute on function public.app_identity_subject_hash(text)
  to supabase_auth_admin, contente_app_user;
grant execute on function public.before_user_created(jsonb)
  to supabase_auth_admin;

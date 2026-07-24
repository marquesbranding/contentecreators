create or replace function public.provision_additional_admin(
  target_auth_user_id uuid,
  target_email text
)
returns table (
  account_id uuid,
  outcome text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(trim(target_email));
  existing_account public.accounts%rowtype;
  provisioned_account_id uuid;
begin
  if not public.app_is_admin() then
    raise exception using
      errcode = '42501',
      message = 'Approved administrator context is required';
  end if;

  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using
      errcode = '22023',
      message = 'Target administrator email is invalid';
  end if;

  if not exists (
    select 1
    from auth.users auth_user
    where auth_user.id = target_auth_user_id
      and lower(auth_user.email) = normalized_email
  ) then
    raise exception using
      errcode = '23503',
      message = 'Target Auth identity does not match the approved email';
  end if;

  select account.*
  into existing_account
  from public.accounts account
  where account.auth_user_id = target_auth_user_id
  for update;

  if found then
    if existing_account.role = 'ADMIN'
      and existing_account.status = 'APPROVED'
      and existing_account.archived_at is null
    then
      return query
      select existing_account.id, 'already_provisioned'::text;
      return;
    end if;

    if existing_account.role is not null
      or existing_account.archived_at is not null
      or existing_account.status in ('SUSPENDED', 'BANNED')
    then
      raise exception using
        errcode = '23514',
        message = 'Target identity already has an incompatible application account';
    end if;

    update public.accounts
    set
      role = 'ADMIN',
      status = 'APPROVED',
      operational_email = normalized_email,
      approved_at = now(),
      submitted_at = coalesce(submitted_at, now()),
      suspended_at = null,
      banned_at = null,
      completion_percentage = 100
    where id = existing_account.id
    returning id into provisioned_account_id;
  else
    insert into public.accounts (
      auth_user_id,
      role,
      status,
      operational_email,
      submitted_at,
      approved_at,
      completion_percentage
    )
    values (
      target_auth_user_id,
      'ADMIN',
      'APPROVED',
      normalized_email,
      now(),
      now(),
      100
    )
    returning id into provisioned_account_id;
  end if;

  return query
  select provisioned_account_id, 'provisioned'::text;
end;
$$;

revoke all on function public.provision_additional_admin(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.provision_additional_admin(uuid, text)
  to contente_app_user;

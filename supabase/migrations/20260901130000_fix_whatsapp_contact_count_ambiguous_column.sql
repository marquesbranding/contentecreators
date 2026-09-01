-- app_confirm_whatsapp_contact declares `returns table (creator_profile_id
-- uuid, whatsapp_contact_count integer)`, which implicitly creates a
-- PL/pgSQL variable named `whatsapp_contact_count` in the function body.
-- The closing UPDATE referenced the creator_profiles column of the same
-- name unqualified, so every confirmation failed with
-- "column reference \"whatsapp_contact_count\" is ambiguous" (42702) —
-- confirming a WhatsApp contact never worked. Qualify the column
-- references so they resolve to the table, not the OUT parameter.
create or replace function public.app_confirm_whatsapp_contact(
  confirmation_id uuid
)
returns table (
  creator_profile_id uuid,
  whatsapp_contact_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_account_id uuid := public.app_current_account_id();
  current_confirmation public.whatsapp_contact_confirmations%rowtype;
  updated_count integer;
begin
  select confirmation.*
  into current_confirmation
  from public.whatsapp_contact_confirmations confirmation
  where confirmation.id = confirmation_id
  for update;

  if current_confirmation.id is null
    or current_confirmation.company_account_id <> caller_account_id
  then
    raise exception using
      errcode = '23503',
      message = 'whatsapp_contact_confirmation_not_found';
  end if;

  if current_confirmation.status = 'CONFIRMED' then
    select profile.whatsapp_contact_count
    into updated_count
    from public.creator_profiles profile
    where profile.id = current_confirmation.creator_profile_id;

    return query
      select current_confirmation.creator_profile_id, updated_count;
    return;
  end if;

  update public.whatsapp_contact_confirmations
  set
    status = 'CONFIRMED',
    confirmed_at = now()
  where id = confirmation_id;

  update public.creator_profiles
  set whatsapp_contact_count = creator_profiles.whatsapp_contact_count + 1
  where id = current_confirmation.creator_profile_id
  returning creator_profiles.whatsapp_contact_count into updated_count;

  return query
    select current_confirmation.creator_profile_id, updated_count;
end;
$$;

revoke all on function public.app_confirm_whatsapp_contact(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.app_confirm_whatsapp_contact(uuid)
  to contente_app_user;

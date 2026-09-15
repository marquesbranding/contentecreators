create type public.registration_step as enum ('ACCOUNT_DETAILS', 'PROFILE', 'AUDIENCE', 'LOCATION_TERMS', 'SUBMITTED');
alter table public.accounts
  add column registration_step public.registration_step not null default 'ACCOUNT_DETAILS',
  add column full_name varchar(160);
update public.accounts set registration_step = 'SUBMITTED' where role is not null and status <> 'ONBOARDING';
update public.accounts set registration_step = 'PROFILE' where role is not null and status = 'ONBOARDING';

-- The application role cannot update account status or arbitrary account columns.
create function public.app_set_registration_step(step public.registration_step)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if step not in ('PROFILE', 'AUDIENCE', 'LOCATION_TERMS') then
    raise exception 'Invalid registration step' using errcode = '42501';
  end if;
  update public.accounts set registration_step = step
  where id = nullif(current_setting('app.jwt.account_id', true), '')::uuid
    and auth_user_id = nullif(current_setting('app.jwt.auth_user_id', true), '')::uuid
    and role in ('INFLUENCER', 'COMPANY') and status = 'ONBOARDING'
    and archived_at is null;
  if not found then
    raise exception 'Registration unavailable' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.app_set_registration_step(public.registration_step) from public;
grant execute on function public.app_set_registration_step(public.registration_step) to contente_app_user;

-- Covers both the new submission path and confirmation links from the previous release.
create function public.sync_submitted_registration_step()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status <> 'ONBOARDING' and new.role is not null then
    new.registration_step := 'SUBMITTED';
  end if;
  return new;
end;
$$;
create trigger accounts_registration_step_trigger before insert or update on public.accounts
for each row execute function public.sync_submitted_registration_step();

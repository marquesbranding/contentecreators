create or replace function public.app_set_profile_completion(
  target_account_id uuid,
  expected_role public.account_role,
  calculated_percentage smallint,
  calculator_version integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role public.account_role;
begin
  if calculated_percentage not between 0 and 100
    or calculator_version <= 0
    or expected_role not in ('INFLUENCER', 'COMPANY')
  then
    raise exception 'invalid profile completion result'
      using errcode = '22023';
  end if;

  select account.role
  into target_role
  from public.accounts account
  where account.id = target_account_id
    and account.archived_at is null
  for update;

  if target_role is null or target_role <> expected_role then
    raise exception 'profile completion account not found'
      using errcode = 'P0002';
  end if;

  if not (
    public.app_is_admin()
    or (
      public.app_context_is_verified()
      and public.app_current_account_id() = target_account_id
      and public.app_current_role() = expected_role
      and public.app_current_status() in (
        'ONBOARDING',
        'CHANGES_REQUESTED',
        'APPROVED'
      )
    )
  ) then
    raise exception 'profile completion update denied'
      using errcode = '42501';
  end if;

  update public.accounts account
  set
    completion_percentage = calculated_percentage,
    completion_version = calculator_version
  where account.id = target_account_id
    and (
      account.completion_percentage is distinct from calculated_percentage
      or account.completion_version is distinct from calculator_version
    );
end;
$$;

revoke all on function public.app_set_profile_completion(
  uuid,
  public.account_role,
  smallint,
  integer
) from public, anon, authenticated;

grant execute on function public.app_set_profile_completion(
  uuid,
  public.account_role,
  smallint,
  integer
) to contente_app_user;

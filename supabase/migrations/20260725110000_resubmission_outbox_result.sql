create or replace function public.app_resubmit_moderation_with_outbox(
  target_account_id uuid,
  expected_account_version integer,
  expected_profile_version integer,
  request_idempotency_key text
)
returns table (
  result_kind text,
  submission_sequence integer,
  account_version integer,
  profile_version integer,
  outbox_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  transition_result record;
  resolved_outbox_id uuid;
begin
  select transition.*
  into transition_result
  from public.app_resubmit_moderation(
    target_account_id,
    expected_account_version,
    expected_profile_version,
    request_idempotency_key
  ) transition;

  if transition_result.result_kind is null then
    raise exception using
      errcode = 'P0001',
      message = 'moderation_resubmission_result_missing';
  end if;

  select item.id
  into resolved_outbox_id
  from public.email_outbox item
  where item.account_id = target_account_id
    and item.idempotency_key = 'onboarding-received:' || request_idempotency_key
  limit 1;

  if transition_result.result_kind = 'APPLIED'
    and resolved_outbox_id is null
  then
    raise exception using
      errcode = 'P0001',
      message = 'moderation_resubmission_outbox_missing';
  end if;

  return query
    select
      transition_result.result_kind::text,
      transition_result.submission_sequence::integer,
      transition_result.account_version::integer,
      transition_result.profile_version::integer,
      resolved_outbox_id;
end;
$$;

revoke all on function public.app_resubmit_moderation_with_outbox(
  uuid,
  integer,
  integer,
  text
) from public, anon, authenticated, service_role;

grant execute on function public.app_resubmit_moderation_with_outbox(
  uuid,
  integer,
  integer,
  text
) to contente_app_user;

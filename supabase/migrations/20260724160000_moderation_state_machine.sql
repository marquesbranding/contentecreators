alter table public.moderation_events
  alter column actor_account_id set not null;

alter table public.moderation_events
  drop constraint moderation_events_transition_check;

alter table public.moderation_events
  add constraint moderation_events_transition_check
  check (
    (
      action = 'ARCHIVE'
      and from_status = to_status
    )
    or
    (
      action <> 'ARCHIVE'
      and from_status <> to_status
    )
  );

alter table public.moderation_events
  drop constraint moderation_events_reason_check;

alter table public.moderation_events
  add constraint moderation_events_reason_check
  check (
    action not in (
      'REQUEST_CHANGES',
      'SUSPEND',
      'RESTORE',
      'BAN',
      'UNBAN',
      'ARCHIVE'
    )
    or length(trim(reason)) >= 3
  );

create or replace function public.app_moderation_transition_is_allowed(
  transition_from public.account_status,
  transition_to public.account_status,
  transition_action public.moderation_action
)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select
    (transition_action = 'SUBMIT'
      and transition_from = 'ONBOARDING'
      and transition_to = 'PENDING_REVIEW')
    or
    (transition_action = 'APPROVE'
      and transition_from = 'PENDING_REVIEW'
      and transition_to = 'APPROVED')
    or
    (transition_action = 'REQUEST_CHANGES'
      and transition_from = 'PENDING_REVIEW'
      and transition_to = 'CHANGES_REQUESTED')
    or
    (transition_action = 'BAN'
      and transition_from in (
        'PENDING_REVIEW',
        'CHANGES_REQUESTED',
        'APPROVED',
        'SUSPENDED'
      )
      and transition_to = 'BANNED')
    or
    (transition_action = 'RESUBMIT'
      and transition_from = 'CHANGES_REQUESTED'
      and transition_to = 'PENDING_REVIEW')
    or
    (transition_action = 'SUSPEND'
      and transition_from = 'APPROVED'
      and transition_to = 'SUSPENDED')
    or
    (transition_action = 'RESTORE'
      and transition_from = 'SUSPENDED'
      and transition_to = 'APPROVED');
$$;

create or replace function public.app_assert_moderation_transition(
  transition_from public.account_status,
  transition_to public.account_status,
  transition_action public.moderation_action,
  trusted_actor_role public.account_role,
  trusted_actor_is_owner boolean,
  transition_reason text,
  last_status_before_ban public.account_status default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if transition_action in ('SUBMIT', 'RESUBMIT') then
    if trusted_actor_role not in ('INFLUENCER', 'COMPANY')
      or not trusted_actor_is_owner
    then
      raise exception using
        errcode = '42501',
        message = 'moderation_owner_required';
    end if;
  elsif trusted_actor_role <> 'ADMIN' then
    raise exception using
      errcode = '42501',
      message = 'moderation_admin_required';
  end if;

  if transition_action in (
    'REQUEST_CHANGES',
    'SUSPEND',
    'RESTORE',
    'BAN',
    'UNBAN',
    'ARCHIVE'
  )
    and length(trim(coalesce(transition_reason, ''))) < 3
  then
    raise exception using
      errcode = '22023',
      message = 'moderation_reason_required';
  end if;

  if transition_action = 'ARCHIVE' then
    if transition_from <> transition_to then
      raise exception using
        errcode = '23514',
        message = 'moderation_archive_status_mismatch';
    end if;
    return;
  end if;

  if transition_action = 'UNBAN' then
    if transition_from <> 'BANNED'
      or last_status_before_ban is null
      or last_status_before_ban not in (
        'PENDING_REVIEW',
        'CHANGES_REQUESTED',
        'APPROVED',
        'SUSPENDED'
      )
      or transition_to <> last_status_before_ban
    then
      raise exception using
        errcode = '23514',
        message = 'moderation_unban_target_mismatch';
    end if;
    return;
  end if;

  if not public.app_moderation_transition_is_allowed(
    transition_from,
    transition_to,
    transition_action
  )
  then
    raise exception using
      errcode = '23514',
      message = 'moderation_transition_not_allowed';
  end if;
end;
$$;

create or replace function public.validate_moderation_event_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  case_owner_account_id uuid;
  case_submission_sequence integer;
  trusted_actor_role public.account_role;
  prior_status public.account_status;
begin
  select
    moderation_case.account_id,
    moderation_case.current_submission_sequence
  into
    case_owner_account_id,
    case_submission_sequence
  from public.moderation_cases moderation_case
  where moderation_case.id = new.moderation_case_id;

  if case_owner_account_id is null then
    raise exception using
      errcode = '23503',
      message = 'moderation_case_not_found';
  end if;

  if new.submission_sequence <> case_submission_sequence then
    raise exception using
      errcode = '40001',
      message = 'moderation_submission_sequence_stale';
  end if;

  select account.role
  into trusted_actor_role
  from public.accounts account
  where account.id = new.actor_account_id
    and account.archived_at is null;

  if trusted_actor_role is null then
    raise exception using
      errcode = '42501',
      message = 'moderation_actor_not_found';
  end if;

  if new.action = 'UNBAN' then
    select event.from_status
    into prior_status
    from public.moderation_events event
    where event.moderation_case_id = new.moderation_case_id
      and event.action = 'BAN'
    order by event.occurred_at desc, event.id desc
    limit 1;
  end if;

  perform public.app_assert_moderation_transition(
    new.from_status,
    new.to_status,
    new.action,
    trusted_actor_role,
    new.actor_account_id = case_owner_account_id,
    new.reason,
    prior_status
  );

  return new;
end;
$$;

create trigger moderation_events_validate_insert_trigger
before insert on public.moderation_events
for each row execute function public.validate_moderation_event_insert();

revoke all on function public.app_moderation_transition_is_allowed(
  public.account_status,
  public.account_status,
  public.moderation_action
) from public;
revoke all on function public.app_assert_moderation_transition(
  public.account_status,
  public.account_status,
  public.moderation_action,
  public.account_role,
  boolean,
  text,
  public.account_status
) from public;
revoke all on function public.validate_moderation_event_insert() from public;


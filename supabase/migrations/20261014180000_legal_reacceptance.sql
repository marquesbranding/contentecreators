begin;

-- Re-acceptance of the latest active TERMS and PRIVACY versions.
--
-- Pending documents are derived, never stored per account: for each document
-- type, the newest active version (retired_at is null, active_from <= now())
-- that the account has no account_consents row for. Publishing a new active
-- version therefore makes every eligible account pending again, with no data
-- migration per account. Existing consent rows are never changed or removed.
--
-- The accept function is SECURITY DEFINER because the account_consents insert
-- policy only admits ONBOARDING/CHANGES_REQUESTED/APPROVED, while a PENDING_REVIEW
-- creator or company must also be able to accept the updated documents.

create or replace function public.app_list_pending_legal_documents()
returns table (
  id uuid,
  document_type public.legal_document_type,
  version_label varchar(40),
  published_at timestamp with time zone
)
language sql
stable
security definer
set search_path to ''
as $$
  with latest_documents as (
    select distinct on (document.document_type)
      document.id,
      document.document_type,
      document.version_label,
      document.published_at
    from public.legal_documents document
    where document.document_type in ('TERMS', 'PRIVACY')
      and document.retired_at is null
      and document.active_from <= now()
    order by
      document.document_type,
      document.active_from desc,
      document.published_at desc
  )
  select latest.id, latest.document_type, latest.version_label, latest.published_at
  from latest_documents latest
  where public.app_context_is_verified()
    and public.app_current_role() in ('INFLUENCER', 'COMPANY')
    and public.app_current_status() in (
      'PENDING_REVIEW',
      'CHANGES_REQUESTED',
      'APPROVED'
    )
    and not exists (
      select 1
      from public.account_consents consent
      where consent.account_id = public.app_current_account_id()
        and consent.legal_document_id = latest.id
    );
$$;


create or replace function public.app_accept_legal_documents(
  target_document_ids uuid[],
  target_request_id text
)
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  caller_account_id uuid := public.app_current_account_id();
  pending_document_ids uuid[];
  submitted_document_ids uuid[];
  inserted_count integer;
begin
  select coalesce(array_agg(pending.id order by pending.id), '{}'::uuid[])
  into pending_document_ids
  from public.app_list_pending_legal_documents() pending;

  -- Nothing pending: a repeated submit is a successful no-op.
  if cardinality(pending_document_ids) = 0 then
    return 0;
  end if;

  select coalesce(array_agg(submitted.document_id order by submitted.document_id), '{}'::uuid[])
  into submitted_document_ids
  from unnest(coalesce(target_document_ids, '{}'::uuid[])) as submitted(document_id);

  -- The user accepted a version that is no longer the latest one (or a partial set).
  if submitted_document_ids is distinct from pending_document_ids then
    raise exception using
      errcode = '22023',
      message = 'legal_documents_not_current';
  end if;

  insert into public.account_consents (
    account_id,
    legal_document_id,
    request_id,
    context
  )
  select
    caller_account_id,
    pending.document_id,
    target_request_id,
    jsonb_build_object('flow', 'reacceptance', 'legalCopyApproved', true)
  from unnest(pending_document_ids) as pending(document_id)
  on conflict (account_id, legal_document_id) do nothing;

  get diagnostics inserted_count = row_count;

  return inserted_count;
end;
$$;


revoke all on function public.app_list_pending_legal_documents() from public;
grant execute on function public.app_list_pending_legal_documents() to contente_app_user;

revoke all on function public.app_accept_legal_documents(uuid[], text) from public;
grant execute on function public.app_accept_legal_documents(uuid[], text) to contente_app_user;

-- Official 1.0 documents must be active before any re-acceptance is requested.
do $$
declare
  pending_accounts integer;
begin
  if not exists (
    select 1 from public.legal_documents
    where document_type = 'TERMS' and version_label = '1.0' and retired_at is null
  ) or not exists (
    select 1 from public.legal_documents
    where document_type = 'PRIVACY' and version_label = '1.0' and retired_at is null
  ) then
    raise exception 'Official TERMS and PRIVACY 1.0 must be active before re-acceptance.';
  end if;

  with latest_documents as (
    select distinct on (document.document_type)
      document.id,
      document.document_type
    from public.legal_documents document
    where document.document_type in ('TERMS', 'PRIVACY')
      and document.retired_at is null
      and document.active_from <= now()
    order by
      document.document_type,
      document.active_from desc,
      document.published_at desc
  )
  select count(distinct account.id)
  into pending_accounts
  from public.accounts account
  cross join latest_documents latest
  where account.role in ('INFLUENCER', 'COMPANY')
    and account.status in ('PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED')
    and not exists (
      select 1
      from public.account_consents consent
      where consent.account_id = account.id
        and consent.legal_document_id = latest.id
    );

  raise notice 'accounts pending legal reacceptance: %', pending_accounts;
end;
$$;

commit;

create index creator_profiles_search_active_trgm_idx
  on public.creator_profiles using gin (search_document extensions.gin_trgm_ops)
  where archived_at is null;

create index accounts_moderation_role_queue_idx
  on public.accounts (role, status, submitted_at, id)
  where archived_at is null
    and status in ('PENDING_REVIEW', 'CHANGES_REQUESTED');

create index sponsorship_placements_delivery_idx
  on public.sponsorship_placements (
    slot_key,
    audience,
    sort_order,
    id,
    starts_at,
    ends_at
  )
  where is_active and archived_at is null;

create index email_outbox_due_claim_idx
  on public.email_outbox (due_at, id)
  where status in ('PENDING', 'FAILED');

create index audit_revisions_entity_period_idx
  on public.audit_revisions (
    entity_table,
    occurred_at desc,
    revision desc
  );

create index audit_revisions_source_timeline_idx
  on public.audit_revisions (
    source,
    occurred_at desc,
    revision desc
  );

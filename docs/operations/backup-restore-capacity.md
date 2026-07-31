# Backup, export, restore, and capacity runbook

This runbook does not claim a backup retention, point-in-time recovery, SLA, or
capacity feature that is not enabled in the current Supabase/Vercel plans.
Before relying on a provider feature, verify it in the client-owned project and
record the plan, retention, region, and restore limitations in the operational
record.

## Backup and export

1. Identify the exact stage and Supabase project reference. Production and
   development evidence must never be mixed.
2. Confirm the provider backup status and most recent successful timestamp in
   the Supabase dashboard. Do not copy secrets into the evidence.
3. For an operator export, use a short-lived direct connection from an approved
   secure workstation and `pg_dump` in custom format. Never use the pooled
   transaction URL for logical backup.
4. Encrypt the artifact before leaving the workstation, apply least-privilege
   access, record checksum/owner/purpose/expiry, and never commit it.
5. Export private Storage objects separately only when the recovery objective
   requires them. Preserve bucket/path metadata without publishing signed URLs.
6. Treat Auth identities and provider configuration as separate recovery
   concerns; a database dump alone is not a complete Supabase project backup.

Example shape (values supplied securely, never pasted into a shell history or
ticket):

```bash
pg_dump --format=custom --no-owner --no-acl \
  --file=contente-creators-YYYYMMDD.dump "$DIRECT_URL"
sha256sum contente-creators-YYYYMMDD.dump
```

## Restore verification

Restores are rehearsed only into a new isolated non-production project or a
disposable local database. Never overwrite production to “test” a backup.

1. Create an empty isolated target and restrict network/operator access.
2. Record the source artifact checksum and target project reference.
3. Restore schema/data with `pg_restore --no-owner --no-acl`.
4. Apply any later committed migrations through the normal migration runner.
5. Verify migration ledger, row counts by non-sensitive aggregate, constraints,
   RLS policies, Auth linkage strategy, private buckets, and audit append-only
   protections.
6. Run health, protected catalog, backoffice denial, and synthetic
   registration/moderation checks with synthetic identities.
7. Inspect logs for personal data or secrets, then destroy the disposable
   target and artifact according to the approved retention decision.
8. Record duration, failures, gaps, and the next rehearsal date.

A successful `pg_restore` is not sufficient evidence; authorization, Storage,
Auth, migrations, and application behavior must also pass.

## Free-tier capacity watch

Review weekly during Beta and before each launch/promotion:

- database size, connection saturation, slow queries, and compute throttling;
- Storage bytes/object count and media-cleanup backlog;
- Auth monthly active users and authentication/email rate limits;
- Vercel build/function duration, bandwidth, invocations, cron execution, and
  log availability;
- SMTP daily/hourly limits, rejection rate, retry queue, and dead letters;
- BrasilAPI failure/timeout/rate-limit trend;
- audit/outbox/history growth and query-plan regressions.

## Upgrade triggers

Escalate an upgrade/re-architecture decision before a hard limit when any of
these occurs:

- sustained usage at 70% of a documented provider quota;
- repeated connection, compute, function-duration, bandwidth, or e-mail
  throttling during normal traffic;
- restore/retention objectives requested by the client are unavailable on the
  active plan;
- the outbox cannot clear within the operational target after provider
  recovery;
- Storage growth or audit/history growth would exceed the current plan before
  the next review;
- representative query plans or Core Web Vitals exceed committed budgets.

Do not silently delete audit, consent, moderation, or security history to stay
within a free tier. Obtain the client/legal retention decision and choose a
reviewed upgrade, archival, anonymization, or scope adjustment.

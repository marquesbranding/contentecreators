# Media cleanup operation

Profile and sponsorship buckets are private and immutable during normal product
flows. Replaced media keeps its database history while its prior object becomes a
cleanup candidate only after an approved retention period.

## Safety model

- The operation defaults to `DRY_RUN`.
- Both orphan and archived retention periods must come from an explicitly
  approved policy reference. The application does not provide default legal
  intervals.
- A report is bounded to 1,000 candidates and has a SHA-256 fingerprint over its
  exact policy, evaluation time, and sorted candidate set.
- Execution requires the report's fingerprint, candidate count, and evaluation
  time. Reports expire after 15 minutes.
- The candidate query is repeated immediately before execution. Any change
  rejects the operation with `REPORT_CHANGED`.
- Active, pending, rejected, recent, or still-referenced media is never a
  candidate. Creator avatar/cover, company logo/cover, and sponsorship creative
  references are all checked.
- Deletion uses the Supabase Storage API in bucket-specific batches. Database
  rows are not manually removed from `storage.objects`.
- Archived `media_assets` metadata and audit history remain in Postgres.
- Provider errors are converted to a safe operational error without object paths
  or provider details.

## Operational sequence

1. Obtain the client/legal-approved retention policy and record its immutable
   approval reference.
2. Run `createServerMediaCleanupService().run(...)` with `mode: "DRY_RUN"` and
   the approved policy.
3. Review the candidate count, categories, paths, `hasMore`, and fingerprint.
4. Within 15 minutes, call the same service with `mode: "EXECUTE"` and the exact
   report confirmation.
5. If `hasMore` is true, start a new dry run after the successful batch.
6. Retain the request/correlation ID and approved policy reference in the
   operator record.

No schedule or production execution may be enabled until the retention and
data-subject procedure launch gate in `docs/launch-blockers.md` is approved.

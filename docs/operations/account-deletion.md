# Self-service account deletion

Creators and companies delete their own account from `/app/profile`
("Excluir conta"). The Privacy Policy (chapters 8 and 9) and Terms 8.5 promise
this. OpenSpec change: `add-self-service-account-deletion`.

## Lifecycle

| Phase           | When                         | What happens                                                                                                                                                                                                                            |
| --------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Requested       | Owner confirms               | `app_request_account_deletion()` (audited, one transaction): account and profile archived, contact visibility revoked, deadlines set, e-mail queued. Then the Auth identity is banned and every session revoked.                        |
| Recovery window | 30 days from the request     | An administrator can recover the account (**Backoffice → account detail → Recuperar conta**, mandatory reason, audited). The Auth ban is lifted and the owner is e-mailed. Contact authorization stays revoked until the owner opts in. |
| Eliminated      | After the window, daily cron | `/api/cron/account-elimination` removes Storage objects, runs `app_eliminate_account_data()` and soft-deletes the Auth identity.                                                                                                        |
| Legal deadline  | 120 days from the request    | Maximum for elimination (Privacy Policy). The routine alerts when a pending account is 15 days or less from it.                                                                                                                         |

Visibility needs no new rule: archived accounts and profiles are already
excluded from the catalog, landing showcase, counters and detail pages.

## Approved disposition matrix (client, 2026-10-13)

| Data class                                                                       | Disposition                                                                                                    |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Profile, social channels, metrics, niches, locations, drafts, WhatsApp click log | **DELETE**                                                                                                     |
| Profile and cover images (Storage + `media_assets`)                              | **DELETE**                                                                                                     |
| Auth identity and linked providers                                               | **DELETE** (Supabase soft delete: row kept, e-mail/metadata/identities removed)                                |
| Account row                                                                      | Kept as a tombstone: name removed, e-mail replaced by `eliminated-<id>@eliminated.invalid`                     |
| Consent records                                                                  | **ANONYMIZE**: keep document version/hash/date; request id, network and user-agent hashes and context removed  |
| Audit snapshots, moderation event reasons                                        | **ANONYMIZE**: personal content replaced by a redaction marker; actor, operation, time and changed fields stay |
| E-mail outbox                                                                    | **ANONYMIZE**: recipient and payload removed                                                                   |
| Access logs (IP, date, time)                                                     | **RETAIN** for 6 months (Marco Civil), outside the application database                                        |
| Blocked identity of a banned account                                             | **RETAIN** (hash only). Banned accounts cannot self-delete.                                                    |

Anonymizing immutable history is the only mutation allowed on
`audit_revisions` and `moderation_events`. It is possible only inside
`app_eliminate_account_data()` (definer-owned, executable by `service_role`
only): the append-only trigger also requires `current_user = 'postgres'` and
the transaction-local setting `app.anonymization_operation = 'on'`, and it
rejects any change outside `before_state`/`after_state` (audit) or `reason`
(moderation events). Direct updates and every delete stay rejected.

## Scheduled routine

- Route: `GET /api/cron/account-elimination`, scheduled daily in `vercel.json`
  (the Hobby plan allows once per day, which is enough: 30-day window plus a
  120-day deadline). It uses the same `Authorization: Bearer $CRON_SECRET` as
  `/api/cron/email-outbox`.
- Outside production the routine only reports (`dryRun: true`) unless the
  request adds `?execute=1`. Production always executes.
- Each run processes at most 10 accounts. The response and logs carry only
  counts and a fingerprint of the candidate set, never personal data or paths.
- Order per account: Storage → database function (system-audited, `CRON`
  source) → Auth soft delete. If Auth deletion fails after the database step,
  the account stays `ELIMINATED` with failure code `AUTH_DELETE` and the next
  run retries only the identity.

## Failure handling

An account that fails stays hidden and moves to `deletion_state = 'FAILED'`
with a code, and the next run retries it.

| Code          | Cause                                                                         | Action                                                                                                                       |
| ------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `STORAGE`     | Supabase Storage rejected the removal                                         | Check Storage health and the service key; the next run retries.                                                              |
| `SPONSORSHIP` | A sponsorship placement still references the account (advertiser or featured) | Archive or reassign the placement in **Backoffice → Patrocínios**, then wait for the next run. Never delete history by hand. |
| `DATABASE`    | Any other database error                                                      | Read the redacted log line (`account_lifecycle`), fix the cause, and wait for the next run.                                  |
| `AUTH_DELETE` | Database done, identity not yet removed                                       | Automatic retry.                                                                                                             |

The log event `account_elimination_deadline_near` (error level) means a pending
account is within 15 days of the legal deadline: resolve it manually and
record the evidence.

Filter **Backoffice → Contas → Arquivamento → Exclusão solicitada** to list
pending accounts, their recovery end date and legal deadline.

## Not covered here

- Deletion started by an administrator for a user: still the manual workflow in
  [data-subject-requests.md](./data-subject-requests.md).
- Provider-side logs and backups, which follow the Privacy Policy.
- Accounts that are not approved can only start the deletion by contacting
  support, because the in-product action lives on the profile page.

# Self-service account deletion

Creators and companies delete their own account from `/app/profile`
("Excluir conta"). The Privacy Policy (chapters 8 and 9) and Terms 8.5 promise
this. Since client review 04 the deletion is **immediate and permanent**: no
recovery window, no administrative recovery, no Auth ban. OpenSpec changes:
`add-self-service-account-deletion` (original flow) and
`apply-client-review-r04` (D10, this lifecycle).

## Lifecycle

One user action, in this order:

| Step                   | What happens                                                                                                                                                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Confirmation           | Password (or a Google login from the last 5 minutes) + the phrase `EXCLUIR` + "não há como recuperá-los" checkbox.                                                                                                                                                                                                             |
| Database (one tx)      | `app_delete_own_account()` (definer, audited as the owner): applies the disposition matrix below, archives sponsorships, enqueues the Storage paths, turns the account into a tombstone with `auth_user_id = null` and queues the confirmation e-mail with `retain_until_sent`.                                                |
| Storage (after commit) | The action removes the returned objects through the service key. A failure only leaves the paths in `storage_cleanup_queue` (they were queued inside the transaction), and the daily routine retries them. Orphaned objects are unreachable: their `media_assets` rows are gone and URLs are signed.                           |
| E-mail                 | The confirmation ("Sua conta foi excluída", template `ACCOUNT_DELETION_REQUESTED`, empty payload) is delivered right away when possible, otherwise by the outbox cron. When the row reaches `SENT` or `DEAD_LETTER`, a database trigger replaces the recipient with `eliminated@eliminated.invalid` and the payload with `{}`. |
| Sessions               | Global sign-out of the Auth user. The Auth user is **kept and not banned** (client decision): the login is simply free. Redirect to `/conta-excluida`.                                                                                                                                                                         |
| Signing in again       | No account matches the login (`auth_user_id` is null on the tombstone), so the user lands on role selection (`/onboarding/account`) and registers from scratch, in the same role or another one, and goes through moderation like any new user.                                                                                |

Who cannot delete: banned accounts (`account_deletion_banned`; their blocked
identity keeps preventing re-entry), `ADMIN` rows and accounts that are not
the caller's own verified context. An administrator with a linked
creator/company profile (`admin-linked-application-profile`) deletes only the
linked row; the `ADMIN` row of the same login stays untouched.

Visibility needs no new rule: the profile rows no longer exist and the
tombstone is archived, so it is out of the catalog, landing showcase,
counters and detail pages immediately.

## Approved disposition matrix (client, 2026-10-13)

| Data class                                                                       | Disposition                                                                                                                                                   |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profile, social channels, metrics, niches, locations, drafts, WhatsApp click log | **DELETE**                                                                                                                                                    |
| Profile, cover and logo images (Storage + `media_assets`)                        | **DELETE** (Storage after the commit, with the cleanup queue as fallback)                                                                                     |
| Auth user and linked providers                                                   | **KEEP**, sessions revoked. Not banned, not deleted: the same Google account or e-mail can register again                                                     |
| Account row                                                                      | Tombstone: name removed, e-mail replaced by `eliminated-<id>@eliminated.invalid`, `auth_user_id = null`, `deletion_state = ELIMINATED`                        |
| Consent records                                                                  | **ANONYMIZE**: keep document version/hash/date; request id, network and user-agent hashes and context removed                                                 |
| Audit snapshots, moderation event reasons                                        | **ANONYMIZE**: personal content replaced by a redaction marker; actor, operation, time and changed fields stay                                                |
| E-mail outbox                                                                    | **ANONYMIZE**: unsent messages cancelled (`DEAD_LETTER`, `ACCOUNT_DELETED`); recipient and payload removed. The confirmation is scrubbed right after delivery |
| Sponsorship placements (advertiser or featured creator)                          | **ARCHIVE**: archived and deactivated; the featured creator reference is cleared; the advertiser reference keeps the tombstone                                |
| Contact preferences, moderation cases                                            | **KEEP** (no personal content)                                                                                                                                |
| Identity auth effects (Auth sync rows linking the login to the account)          | **DELETE**: they carry the login link, which the tombstone must not keep. Changes the approved matrix; pending client confirmation                            |
| Access logs (IP, date, time)                                                     | **RETAIN** for 6 months (Marco Civil), outside the application database                                                                                       |
| Blocked identity of a banned account                                             | **RETAIN** (hash only). Banned accounts cannot self-delete.                                                                                                   |

Anonymizing immutable history is the only mutation allowed on
`audit_revisions` and `moderation_events`. It is possible only inside
`app_erase_account_data()`, which nobody but the database owner can execute and
which only the definer functions below call: the append-only trigger also
requires `current_user = 'postgres'` and the transaction-local setting
`app.anonymization_operation = 'on'`. Within that path it accepts only:

- on `audit_revisions`: changes to `before_state` and `after_state`, and
  `reason` set to the marker `[removido]`;
- on `moderation_events`: `reason` set to the marker, and `requested_fields`
  with the same field keys and every `note` cleared.

Direct updates and every delete stay rejected. The audit scrub runs last inside
`app_erase_account_data()`, so it also covers the revisions written by the
statements above, and it is limited to the account's own rows through the
`(entity_table, entity_id)` index.

## Database functions

| Function                                 | Executable by       | Purpose                                                                                                                                                 |
| ---------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app_delete_own_account()`               | `contente_app_user` | Self-service deletion of the verified caller's own creator/company account. Returns the account id, the confirmation outbox id and the Storage objects. |
| `app_eliminate_account_data(account_id)` | `service_role`      | Catch-up and legacy path: erases a `REQUESTED`/`FAILED` account of the retired flow, or unlinks an old `ELIMINATED` tombstone. No window check.         |
| `app_erase_account_data(account_id)`     | owner only          | Shared core applying the matrix. Not `security definer`; never granted.                                                                                 |

`app_request_account_deletion()` and `app_admin_recover_account()` were
dropped.

## Daily catch-up routine

- Route: `GET /api/cron/account-elimination`, scheduled daily in `vercel.json`,
  with `Authorization: Bearer $CRON_SECRET` (same as `/api/cron/email-outbox`).
- Outside production the routine only reports (`dryRun: true`) unless the
  request adds `?execute=1`. Production always executes.
- Each run:
  1. retries `FAILED` accounts left by the retired 30-day flow (at most 10):
     runs `app_eliminate_account_data()` as `SYSTEM`/`CRON`, then lifts the old
     Auth ban (unless the login still owns a `BANNED` account);
  2. removes up to 100 objects from `storage_cleanup_queue`;
  3. raises `account_elimination_deadline_near` (error) when a legacy
     `REQUESTED`/`FAILED` account is 15 days or less from its 120-day legal
     deadline.
- `REQUESTED` accounts are **never** eliminated by the routine (see below).
- The response and logs carry only counts and a fingerprint of the candidate
  set, never personal data or paths.

## Failure handling

| Signal                                             | Cause                                                               | Action                                                                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| User sees "nada foi removido"                      | The database transaction failed; nothing changed                    | The user can retry. Check the redacted `delete_account` log line.                                           |
| `account_deletion_storage_deferred` (warn)         | Storage rejected the removal after the commit                       | Nothing to do: the paths are queued and the routine retries. Check Storage health if it repeats.            |
| `account_storage_cleanup_failed` (error)           | The routine could not drain the queue                               | Check Storage health and the service key; rows keep `attempt_count` and `last_error_code`.                  |
| `account_deletion_session_revoke_failed` (error)   | Global sign-out failed after the deletion                           | Other sessions of that login see role selection (no data). Revoke them in the Supabase dashboard if needed. |
| Legacy account `failed_identity` with `AUTH_UNBAN` | The data was erased, but the old ban could not be lifted afterwards | Not retried automatically (the erase unlinked the login). Lift the ban by hand in the Auth dashboard.       |
| Legacy account `FAILED` with `DATABASE`            | Any other database error                                            | Read the redacted log line (`account_lifecycle`), fix the cause, and wait for the next run.                 |

## Accounts left by the retired 30-day flow

Accounts requested between the deploy of `097e84a` and this change can be in
`REQUESTED` (still inside their old recovery window), `FAILED`, or an old
`ELIMINATED` tombstone that still holds `auth_user_id`; their Auth users are
banned. They are migrated by an operator script, not by a migration, because
eliminating `REQUESTED` accounts is irreversible and needs the list confirmed
with the client first:

1. List them read-only (counts, account ids and a candidate fingerprint only):

   ```bash
   npm run accounts:eliminate-legacy
   ```

2. Confirm the list with the client.
3. Run it against the target environment. Execution always needs the
   confirmation flag and the fingerprint printed by the dry run, in every
   environment. The script refuses when the candidate set has changed since
   that dry run, and it treats a Supabase URL with the production ref
   (`kstbhqeiebutpfvswyla`) as production even when `APP_ENV` says otherwise:

   ```bash
   npm run accounts:eliminate-legacy -- --execute --confirmed-with-client --fingerprint=<fingerprint of the dry run>
   ```

For each account the script first erases through `app_eliminate_account_data()`
(audited as `SYSTEM`/`SCRIPT`), then lifts the old ban (unless the login still
owns a `BANNED` account), and removes the queued Storage objects. If the erase
fails, the ban stays and the account is retried on the next run. If the ban
cannot be lifted after the erase, the script reports `failed_identity` (log
code `AUTH_UNBAN`). The erase has already unlinked the login, so later runs
cannot find it again: this case needs manual follow-up in the Auth dashboard.
It needs
`DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SERVICE_ROLE_KEY` of that
environment. Record the request id it prints as evidence.

## Backoffice

**Contas → Arquivamento → Excluídas** lists tombstones (badge "Excluída") and
any legacy account still pending (badge "Exclusão pendente"). The detail page
of a deleted account shows "Conta excluída", without e-mail or profile, and
offers no action.

## Not covered here

- Deletion started by an administrator for a user: still the manual workflow in
  [data-subject-requests.md](./data-subject-requests.md).
- Provider-side logs and backups, which follow the Privacy Policy.
- Accounts that are not approved can only start the deletion by contacting
  support, because the in-product action lives on the profile page.

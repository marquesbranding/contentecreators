# Moderation state machine

An account has exactly one role and one current status. Profile completion is
informational and never grants approval. All commands re-read the verified
actor and current version inside one database transaction.

## States

| Status              | Owner experience                                                     | Catalog/backoffice consequence                                                  |
| ------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `ONBOARDING`        | Complete or restore a draft and submit it.                           | No catalog data; visible to admins only where onboarding operations require it. |
| `PENDING_REVIEW`    | “Seu cadastro está sendo analisado”; profile is read-only.           | No listing/detail data; submission enters the moderation queue.                 |
| `CHANGES_REQUESTED` | Read the admin reason, correct the profile, and resubmit.            | No listing/detail data; history and submission sequence are preserved.          |
| `APPROVED`          | Use the role-specific catalog and edit permitted profile fields.     | Eligible for protected presentation; approved edits do not reset status.        |
| `SUSPENDED`         | Read the safe suspension state; no product access.                   | Immediately removed from catalog/contacts/placements until restored.            |
| `BANNED`            | Access is terminated and recreation by the known identity is denied. | Immediately removed; blocked-identity and Auth side effects are scheduled.      |

Archived records are orthogonal to status: an archived account/profile is not
eligible for product presentation even if its stored status is `APPROVED`.

## Allowed transitions

Owner commands follow one path; admin commands are available from any status
except their own destination, so a moderator can change their mind at any
point. `ONBOARDING` is the exception: an account still mid-signup can only be
banned or archived. Source of truth: `STANDARD_TRANSITIONS` in
`src/features/moderation/domain/moderation-policy.ts`.

```text
ONBOARDING        --SUBMIT----------> PENDING_REVIEW      (owner)
CHANGES_REQUESTED --RESUBMIT--------> PENDING_REVIEW      (owner)

PENDING_REVIEW | CHANGES_REQUESTED | SUSPENDED | BANNED   --APPROVE---------> APPROVED
PENDING_REVIEW | APPROVED          | SUSPENDED | BANNED   --REQUEST_CHANGES-> CHANGES_REQUESTED
PENDING_REVIEW | CHANGES_REQUESTED | APPROVED  | BANNED   --SUSPEND---------> SUSPENDED
ONBOARDING | PENDING_REVIEW | CHANGES_REQUESTED | APPROVED | SUSPENDED --BAN-> BANNED
any non-archived                                          --ARCHIVE---------> archived record
```

"Solicitar alterações" (`REQUEST_CHANGES`) is the only way to correct an
account's declared data: the backoffice cannot edit profiles, so the admin
points at the fields to fix and the owner edits and resubmits. It can be
requested at any time, including on an approved profile. An approved profile
that receives a change request leaves the catalog until it is resubmitted and
approved again (the `CHANGES_REQUESTED` row above).

`RESTORE` (`SUSPENDED → APPROVED`) and `UNBAN` remain only so old events still
validate; the admin UI no longer offers them. Leaving `BANNED` through any
other action performs the same unban side effects (the matching
blocked-identity restriction is removed through an audited side effect).

## Command requirements

| Command               | Actor | Mandatory input and effects                                                                                                                        |
| --------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUBMIT`              | Owner | Valid complete role profile, current Terms/Privacy/contact decision, profile version, idempotency key. Creates case/event/audit/outbox atomically. |
| `REQUEST_CHANGES`     | Admin | Non-empty actionable reason, current account/profile version, confirmation.                                                                        |
| `RESUBMIT`            | Owner | Corrected valid profile, current versions, preserved case, incremented submission sequence.                                                        |
| `APPROVE`             | Admin | Current reviewed version and explicit confirmation.                                                                                                |
| `SUSPEND` / `RESTORE` | Admin | Mandatory reason and current version; catalog/cache eligibility changes immediately.                                                               |
| `BAN`                 | Admin | Mandatory reason and current version; creates blocked identity and retryable Auth effect.                                                          |
| `UNBAN`               | Admin | Exceptional mandatory reason; removes restriction and records actor/history.                                                                       |
| `ARCHIVE`             | Admin | Mandatory reason; soft-removes the account from active operation.                                                                                  |

Forbidden source states, stale versions, duplicate idempotency keys, missing
reasons, non-admin privileged actors, and archived targets fail closed without
partial history or email delivery.

## Atomic evidence

Every successful transition commits the current state, immutable moderation
event, audit revision, optional identity effect, and transactional email intent
as one business transaction. SMTP delivery happens after commit and cannot
roll back moderation. Catalog authorization rechecks status/database state, so
UI caches are not the security boundary.

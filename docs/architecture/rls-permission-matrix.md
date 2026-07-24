# Row-level security permission matrix

This document defines the database authorization contract for every public
business table in the Contente Creators Beta. RLS decides which rows a verified
request may reach. Server-side policies and minimal DTO mappers still decide
which fields and actions the application exposes.

## Runtime roles and verified claims

Business tables are not available directly to Supabase `anon` or
`authenticated` through PostgREST, except for active public legal-document
metadata. The Next.js server verifies the Supabase access token and then
assumes the non-login PostgreSQL role `contente_app_user` for the duration of a
short transaction.

The transaction sets these local, server-verified claims before executing any
query:

| Setting                  | Meaning                                                          |
| ------------------------ | ---------------------------------------------------------------- |
| `app.jwt.auth_user_id`   | Verified Supabase `auth.users.id`                                |
| `app.jwt.account_id`     | Resolved, non-archived application account ID                    |
| `app.jwt.account_role`   | Current `ADMIN`, `INFLUENCER`, or `COMPANY` role                 |
| `app.jwt.account_status` | Current application account status                               |
| `app.jwt.request_id`     | Correlation identifier for the server request                    |
| `app.audit.*`            | Separate verified actor/source/reason context for audit triggers |

The browser cannot choose these values. Empty, malformed, contradictory, or
stale claims deny access. The database confirms the claimed account, Auth user,
role, status, and archive state against `accounts`.

The migration/bootstrap connection and narrowly scoped Auth administration
client remain privileged operational paths. They are never exposed to the
browser and must not be used for ordinary product reads.

## Legend

- `—`: no access.
- `R-own`: read only rows owned by the current account.
- `W-own`: insert/update only owner rows and only through an authorized server
  use case. No hard delete is granted.
- `R-approved`: read presentation-eligible rows whose owning account is
  `APPROVED` and whose account/profile is not archived.
- `R-active`: read active reference/configuration rows needed by the journey.
- `R-status`: read the current account row only to decide the safe status
  experience.
- `R-all` / `W-all`: administrator access through authorized server use cases;
  destructive behavior remains soft/archive-based.
- `System`: database trigger, security-definer command, migration, bootstrap, or
  signed operational worker only.

“Owner” below covers `ONBOARDING`, `PENDING_REVIEW`,
`CHANGES_REQUESTED`, and `APPROVED`, subject to the per-table notes. A
`PENDING_REVIEW` owner is read-only. An `ONBOARDING` or
`CHANGES_REQUESTED` owner may change allowed draft/profile rows. An
`APPROVED` owner may edit permitted profile fields without changing status.

## Table matrix

| Table                         | Anonymous  | Owner                                                         | Approved influencer                   | Approved company                                    | Admin                       | Suspended         | Banned         |
| ----------------------------- | ---------- | ------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------- | --------------------------- | ----------------- | -------------- |
| `accounts`                    | —          | `R-own`; status/role changes are server commands              | `R-approved` account skeletons        | `R-approved` creator account skeletons              | `R-all`, `W-all`            | `R-status` own    | `R-status` own |
| `creator_profiles`            | —          | `R-own`; `W-own` in onboarding/corrections/approved           | `R-approved`, excluding self in DAL   | `R-approved`                                        | `R-all`, `W-all`            | —                 | —              |
| `company_profiles`            | —          | Company `R-own`; `W-own` in onboarding/corrections/approved   | `R-approved` presentation rows        | — except own                                        | `R-all`, `W-all`            | —                 | —              |
| `company_locations`           | —          | Company `R-own`; `W-own` in onboarding/corrections/approved   | —                                     | — except own                                        | `R-all`, `W-all`            | —                 | —              |
| `niches`                      | —          | `R-active`                                                    | `R-active`                            | `R-active`                                          | `R-all`, `W-all`            | —                 | —              |
| `creator_niches`              | —          | Creator `R-own`; `W-own` in onboarding/corrections/approved   | `R-approved`                          | `R-approved`                                        | `R-all`, `W-all`            | —                 | —              |
| `social_profiles`             | —          | `R-own`; `W-own` in onboarding/corrections/approved           | `R-approved` visible rows             | `R-approved` visible rows; private contacts via DTO | `R-all`, `W-all`            | —                 | —              |
| `creator_metric_snapshots`    | —          | Creator `R-own`; append a valid `W-own` snapshot              | `R-approved`                          | `R-approved`                                        | `R-all`, `W-all`            | —                 | —              |
| `media_assets`                | —          | `R-own`; metadata writes follow the owner media lifecycle     | `R-approved` active presentation rows | `R-approved` active creator presentation rows       | `R-all`, `W-all`            | —                 | —              |
| `moderation_cases`            | —          | `R-own`; submission transition is a server command            | —                                     | —                                                   | `R-all`, `W-all`            | `R-own` as needed | —              |
| `moderation_events`           | —          | `R-own`; immutable                                            | —                                     | —                                                   | `R-all`; no write           | `R-own` as needed | —              |
| `sponsorship_placements`      | —          | — until approved                                              | Active/scheduled audience rows only   | Active/scheduled audience rows only                 | `R-all`, `W-all`            | —                 | —              |
| `email_outbox`                | —          | —                                                             | —                                     | —                                                   | `R-all`; retry command only | —                 | —              |
| `email_attempts`              | —          | —                                                             | —                                     | —                                                   | `R-all`; immutable          | —                 | —              |
| `legal_documents`             | `R-active` | `R-active`                                                    | `R-active`                            | `R-active`                                          | `R-all`, `W-all`            | `R-active`        | —              |
| `account_consents`            | —          | `R-own`; append only through consent/submission command       | —                                     | —                                                   | `R-all`; no edit            | —                 | —              |
| `account_contact_preferences` | —          | Creator `R-own`; `W-own` through validated preference command | —                                     | Consent result only through creator contact DTO     | `R-all`, `W-all`            | —                 | —              |
| `blocked_identities`          | —          | —                                                             | —                                     | —                                                   | `R-all`, `W-all`            | —                 | —              |
| `audit_revisions`             | —          | —                                                             | —                                     | —                                                   | `R-all`; immutable          | —                 | —              |

## Row predicates by capability

### Current account and owner rows

An owner row is reachable only when:

1. the database-resolved current account matches `app.jwt.account_id`;
2. its `auth_user_id` matches `app.jwt.auth_user_id`;
3. its stored role/status match the claimed role/status;
4. the account is not archived; and
5. the target row belongs to that account directly or through its profile.

Owner writes additionally require:

- status `ONBOARDING`, `CHANGES_REQUESTED`, or `APPROVED`;
- an allowed table and operation;
- no attempt to change account role/status, moderation history, ownership,
  audit fields, or another aggregate; and
- server-side validation, optimistic version checks, and audit context.

RLS is defense in depth and does not replace the server command policy.

### Approved catalog rows

A catalog row is reachable only when the viewer is `APPROVED` and the target:

- belongs to an `APPROVED`, non-archived account;
- belongs to a non-archived profile;
- is complete enough for its requested presentation, as enforced by the DAL;
- is active/visible when the child table has such a flag; and
- satisfies the viewer-role rule.

An approved `COMPANY` may read approved creator presentation rows. An approved
`INFLUENCER` may read other approved creator presentation rows and approved
company carousel rows. Contact visibility is never inferred from catalog read
access: private contact fields require the dedicated company-only,
consent-aware DTO path.

### Suspended and banned accounts

`SUSPENDED` and `BANNED` claims never satisfy an approved catalog policy.
Suspended users may resolve only the minimum own status/moderation reason
needed by the status screen. Banned sessions are revoked where supported; a
short-lived request that still reaches the database may resolve only the
minimum account status before the server terminates product access.

### Administrative rows

Admin policies require a currently non-archived `accounts` row whose
`auth_user_id`, ID, role `ADMIN`, and status `APPROVED` all match the verified
transaction claims. Losing the admin role or approved status invalidates the
next read or write even if the Supabase Auth session remains valid.

Administrators receive no hard-delete grant and cannot update/delete
`moderation_events`, `email_attempts`, or `audit_revisions`.

### System-only writes

The following operations never receive a normal `contente_app_user` table
policy:

- Auth identity creation/administration and initial account bootstrap;
- moderation state transition internals;
- audit revision capture;
- moderation event append;
- blocked-identity side effects;
- transactional outbox enqueue/claim/delivery bookkeeping;
- email-attempt append; and
- exceptional retention/anonymization procedures.

They execute through reviewed security-definer commands, triggers, signed
workers, or narrowly scoped operational connections and remain audited.

## Required negative tests

The local integration suite must prove:

1. anonymous and direct Supabase `authenticated` roles cannot read business
   tables;
2. `contente_app_user` without complete verified local claims is denied;
3. an owner can reach only its allowed rows;
4. cross-account reads and writes fail;
5. approved influencer/company catalog access follows the role matrix;
6. creator contact preferences do not expose private contacts to influencers;
7. every non-approved status receives no catalog rows;
8. a current admin can reach operational rows and a revoked admin cannot;
9. suspended and banned claims cannot mutate or read catalog data;
10. history/outbox/blocked-identity tables remain hidden from normal users; and
11. no runtime role can hard-delete business or history records.

# Application data dictionary

This dictionary covers every application-owned table in the Beta schema. The
authoritative column definitions and constraints remain the committed Drizzle
schema and Supabase migrations. `auth.users`, `storage.objects`, and Supabase
internal schemas are provider-owned and are not application tables.

## Classification

- **Restricted**: identity, contact, legal, moderation, security, or operational
  data. It must never be included in public or catalog DTOs unless the
  documented, consent-aware use case explicitly allows it.
- **Private**: owner/profile data available only through authorized product
  journeys.
- **Presentation**: a minimized subset may be exposed to an approved catalog
  viewer after status, archive, and role checks.
- **Reference**: non-personal configuration data with explicitly documented
  read scope.

No table grants ordinary runtime hard delete. `archived_at` and append-only
history preserve reviewable business history.

## Tables

| Table                         | Purpose                                                                                     | Sensitive/restricted fields                                                                | Exposure and audit policy                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `accounts`                    | Links a Supabase identity to one application role and moderation status.                    | `auth_user_id`, `operational_email`, status timestamps.                                    | Private status skeleton; selected non-sensitive account fields support approved catalog joins. Role/status/archive changes are privileged and audited. |
| `onboarding_drafts`           | Owner-scoped optimistic draft before submission/resubmission.                               | Entire JSON payload may contain profile/contact data.                                      | Owner and admin use only; versioned updates are audited. Never serialized publicly.                                                                    |
| `creator_profiles`            | Influencer/UGC identity, bio, location, media references, and completion inputs.            | `whatsapp_e164` and any unpublished profile fields.                                        | Minimized presentation DTO only for approved, non-archived profiles. Inserts/updates are audited.                                                      |
| `company_profiles`            | Company legal/presentation profile and media references.                                    | `cnpj`, `legal_name`, `whatsapp_e164`; CNPJ is restricted even when autocomplete assisted. | Approved creators may receive a minimized logo-carousel DTO without CNPJ/contact. Changes are audited.                                                 |
| `company_locations`           | One or more company addresses, with one active primary address.                             | Postal code, street, number, complement, neighborhood.                                     | Owner/admin only in Beta; location changes are audited.                                                                                                |
| `niches`                      | Reviewed creator niche taxonomy.                                                            | None.                                                                                      | Active reference rows are readable in authenticated journeys; admin changes are audited.                                                               |
| `creator_niches`              | Many-to-many creator-to-niche assignment.                                                   | Association can reveal profile interests.                                                  | Presentation eligible only with an approved creator. Assignment changes are audited with the profile aggregate.                                        |
| `social_profiles`             | Creator/company social URLs and identifiers.                                                | URLs/handles can become contact channels.                                                  | Approved presentation follows visibility rules; write access is owner/admin and audited. Instagram is a profile platform, never an Auth provider.      |
| `creator_metric_snapshots`    | Dated, self-reported follower and engagement metrics.                                       | Profile association and reported performance.                                              | Approved presentation is explicitly labelled self-reported. Rows are historical and not overwritten silently.                                          |
| `media_assets`                | Private Storage object metadata and replacement lifecycle.                                  | `storage_path`, ownership, metadata, rejection/replacement links.                          | Clients receive short-lived authorized delivery, never raw storage paths. Lifecycle changes are audited.                                               |
| `moderation_cases`            | Current moderation queue state, assignment, reason, and submission sequence.                | Reasons and operational assignments.                                                       | Owner sees only its safe status/reason; admin receives full review DTO. Commands are audited.                                                          |
| `moderation_events`           | Immutable append-only moderation transition history.                                        | Reasons, actors, before/after states.                                                      | Owner-safe history or admin detail only. Trigger-protected append-only record.                                                                         |
| `sponsorship_placements`      | Manually managed promotional placement, audience, schedule, order, and creative references. | Internal advertiser/creative references.                                                   | Eligible active creative only; admin CRUD is audited. Contains no price, payment, invoice, or campaign workflow.                                       |
| `email_outbox`                | Idempotent transactional e-mail intent and retry state.                                     | `recipient_email`, payload, error classifications, lock metadata.                          | Admin/system only. Payloads are minimized; delivery state changes are audited/operationally logged without recipient values.                           |
| `email_attempts`              | Immutable provider-attempt history.                                                         | Provider message hash, error/response classifications.                                     | Admin/system only and append-only. Raw provider payloads and message IDs are not stored.                                                               |
| `legal_documents`             | Version/hash/activation metadata for Terms, Privacy, and contact visibility.                | Approved document URL may be public; no personal data.                                     | Active metadata is public where required. Admin publication/retirement is audited.                                                                     |
| `account_consents`            | Immutable proof that an account accepted a specific legal-document version.                 | Account link, request/network/user-agent hashes, context.                                  | Owner/admin use only; append-only and audited. No raw IP or user agent is stored.                                                                      |
| `account_contact_preferences` | Versioned creator permission for approved companies to view contact channels.               | Contact-visibility decisions.                                                              | Owner/admin only; catalog gets only the consent-aware result. Changes are audited.                                                                     |
| `blocked_identities`          | Hashed tombstone preventing known banned identities from recreating an account.             | Identity/provider-subject hashes, reason, actors.                                          | Admin/Auth-hook only. Block/unblock is exceptional, reasoned, and audited.                                                                             |
| `identity_auth_effects`       | Retryable synchronization of BAN/UNBAN with Supabase Auth.                                  | Auth user/account links and operational failure category.                                  | System/admin operational use only; idempotent state transitions are audited.                                                                           |
| `audit_revisions`             | Envers-style append-only before/after revision ledger.                                      | Actor, reason, request ID, redacted JSON snapshots.                                        | Admin read only; database-generated and immutable. Snapshot redaction is mandatory.                                                                    |
| `rate_limit_buckets`          | Privacy-safe counters for bounded abuse controls.                                           | Hashed network/account key.                                                                | System only; short-lived operational record, never a product DTO.                                                                                      |

## Enumerated roles and statuses

| Type              | Values                                                                                 | Contract                                                                               |
| ----------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Account role      | `ADMIN`, `INFLUENCER`, `COMPANY`                                                       | Exactly one role per account. `ADMIN` is never a public registration choice.           |
| Creator type      | `INFLUENCER`, `UGC`                                                                    | Exclusive subtype of an influencer account.                                            |
| Account status    | `ONBOARDING`, `PENDING_REVIEW`, `CHANGES_REQUESTED`, `APPROVED`, `SUSPENDED`, `BANNED` | Product access is derived from the state machine, never from profile completion alone. |
| Identity provider | `EMAIL`, `GOOGLE`                                                                      | Instagram and other social networks are presentation data only.                        |

The complete enumerations live in `src/db/schema/enums.ts`. User-facing
interfaces map every enum to reviewed `pt-BR`; raw enum values must not leak.

## Audit contract

Audited mutations set transaction-local actor, role, source, request, reason,
and correlation context. Audit triggers append a redacted revision containing
only allowlisted before/after fields. Passwords, tokens, SMTP secrets, raw
provider responses, signed URLs, full contact values, CNPJ, and Storage paths
must not appear in audit snapshots or logs.

The following histories are independently append-only:

- `audit_revisions`;
- `moderation_events`;
- `email_attempts`;
- `account_consents`;
- creator metric snapshots.

See [moderation state machine](./moderation-state-machine.md) and
[RLS permission matrix](./rls-permission-matrix.md) for transition and access
rules.

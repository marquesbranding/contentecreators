## ADDED Requirements

### Requirement: Meaningful business entities produce immutable revisions

The system SHALL create append-only audit revisions for inserts, updates, status transitions, soft removals, restorations, and privileged reads/actions where meaningful across accounts, profiles, locations, social data/metrics, media metadata, moderation, sponsorships, consents, administrator roles, blocked identities, and email retry operations.

#### Scenario: Profile owner changes catalog data

- **WHEN** a valid profile update commits
- **THEN** an immutable revision identifies the entity, operation, changed fields, actor, source, and timestamp

#### Scenario: Administrator changes a role

- **WHEN** an authorized administrator grants or revokes an application role
- **THEN** the prior/new values and mandatory reason are captured in audit history

### Requirement: Revisions capture Envers-style before and after state

Each revision SHALL include a monotonic revision identifier, entity/table and record identifier, operation, occurred time, request/correlation ID, actor account/type/role, source surface, reason when applicable, changed-field list, and redacted before/after JSON snapshots.

#### Scenario: Single field changes

- **WHEN** one audited field changes
- **THEN** the revision’s changed-field list names that field and before/after snapshots reflect the redacted difference

### Requirement: Audit snapshots exclude secrets and unsafe payloads

The system MUST redact or omit passwords, password hashes, access/refresh/recovery tokens, SMTP/service credentials, raw OAuth/provider secrets, signed media URLs, raw BrasilAPI responses, and unnecessary full email bodies. Personal fields SHALL be retained only where justified for the revision purpose and protected from normal users.

#### Scenario: Audited object contains a secret-like key

- **WHEN** the audit trigger/mapper processes a configured sensitive field
- **THEN** the stored snapshot omits or replaces the value deterministically

### Requirement: Actor context is transaction-local and attributable

The system SHALL set verified actor account, actor role/type, source, request ID, and reason as transaction-local audit context for application writes. Sensitive moderation functions MUST reject missing required actor/reason; unexpected missing context SHALL be recorded as `SYSTEM_UNKNOWN` and emit telemetry.

#### Scenario: Privileged transition lacks actor context

- **WHEN** a moderation transition is invoked without a verified admin actor
- **THEN** the transaction fails without changing status

#### Scenario: Background maintenance updates an audited record

- **WHEN** an approved system task performs the update
- **THEN** the revision identifies a specific system source and request/job ID

### Requirement: Audit records cannot be mutated through the application

Normal runtime roles and backoffice actions MUST NOT update or delete audit revisions or moderation events. Any retention/anonymization operation SHALL be separately authorized, policy-driven, and itself auditable.

#### Scenario: Admin attempts to edit audit reason after the fact

- **WHEN** an administrator invokes a direct or UI mutation against an existing revision
- **THEN** the system rejects it

### Requirement: Administrators can inspect bounded audit history

The backoffice SHALL allow `ADMIN` users to filter/paginate audit history by entity, record, actor, action, source, and period. Results SHALL use safe display DTOs and SHALL NOT expose redacted original secrets.

#### Scenario: Admin investigates account history

- **WHEN** an administrator filters revisions by account ID
- **THEN** ordered relevant revisions and moderation events are displayed with safe before/after changes

### Requirement: Moderation history is a first-class audit trail

The system SHALL maintain an immutable moderation event for every submission, correction request, resubmission, approval, suspension, restoration, ban, unban, and archive action, including from/to states and mandatory reasons where defined.

#### Scenario: User resubmits after correction

- **WHEN** `CHANGES_REQUESTED → PENDING_REVIEW` commits
- **THEN** a new moderation event is added without replacing the original correction event

### Requirement: The product captures versioned LGPD-oriented consent

The system SHALL present unselected consent controls for the active Terms of Use, Privacy Policy, and creator contact visibility where applicable, and SHALL store accepted document version/hash, account, timestamp, and safe context.

#### Scenario: Legal document version changes

- **WHEN** a future active version requires renewed acceptance
- **THEN** affected users are prompted before the next operation that requires current consent and the previous acceptance remains historical

### Requirement: Personal data is protected by least privilege and minimization

The system SHALL restrict CNPJ, WhatsApp, email, addresses, audit snapshots, and moderation data to role/purpose-appropriate server DTOs and RLS policies. Logs, analytics, fixtures, and public metadata MUST NOT contain production personal data.

#### Scenario: Influencer requests company private data

- **WHEN** an influencer tries to select company CNPJ or contact details
- **THEN** server authorization/RLS returns no such fields

#### Scenario: Test suite is seeded

- **WHEN** local or CI fixtures are created
- **THEN** only deterministic synthetic identities and data are used

### Requirement: Removal is soft and history-preserving by default

The system SHALL implement administrative removal as soft archive, excluding the record from operational listings while preserving the minimum authorized profile/moderation/audit history. Hard deletion/anonymization requires a separate approved LGPD retention procedure.

#### Scenario: Account is archived

- **WHEN** an administrator confirms removal with reason
- **THEN** the account disappears from catalog/active management defaults and the archive action remains auditable

### Requirement: Legal retention and data-subject handling are launch gates

The system SHALL expose approved public privacy/support contact information and SHALL document the client-owned retention, export, correction, and deletion/anonymization procedure before production launch. It SHALL NOT invent an automatic purge interval without approval.

#### Scenario: Production readiness review occurs

- **WHEN** the release checklist reaches the LGPD gate
- **THEN** deployment is blocked until approved legal documents, contact, and retention/data-request procedure are recorded

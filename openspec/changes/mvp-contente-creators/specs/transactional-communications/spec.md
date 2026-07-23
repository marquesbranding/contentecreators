## ADDED Requirements

### Requirement: All production transactional email uses Marques Branding SMTP

The system SHALL configure both Supabase Auth email delivery and application lifecycle email delivery through client-provided Marques Branding SMTP settings in development/production as applicable. SMTP secrets MUST remain server-side and environment-specific.

#### Scenario: Production authentication email is sent

- **WHEN** Supabase Auth needs to send confirmation or recovery email in production
- **THEN** it uses the configured Marques Branding SMTP sender and credentials

#### Scenario: Application lifecycle email is sent

- **WHEN** an application outbox item becomes due
- **THEN** the server-only SMTP adapter uses the same approved SMTP authority with application templates

### Requirement: Supabase Auth owns Auth-managed templates

The system SHALL maintain `pt-BR` confirmation, recovery, invite/admin-provisioning as applicable, and secure email-change templates in Supabase configuration, with environment-correct redirect URLs.

#### Scenario: User opens confirmation link

- **WHEN** a valid Auth email link is activated
- **THEN** the callback completes on the matching local/development/production origin and never redirects to another environment

### Requirement: Application sends required lifecycle templates

The system SHALL provide branded `pt-BR` templates for onboarding received, changes requested with reason, approval, suspension, restoration when desired, ban/block notice, and other explicitly required moderation events. Messages SHALL include support guidance and MUST NOT include passwords, tokens, or unnecessary sensitive profile data.

#### Scenario: Changes are requested

- **WHEN** an account transitions to `CHANGES_REQUESTED`
- **THEN** exactly one notification intent references the correction reason and safe return link

#### Scenario: Account is approved

- **WHEN** an account transitions to `APPROVED`
- **THEN** exactly one approval message intent provides the product entry link

### Requirement: Business transitions use a transactional outbox

The system SHALL insert application email intent in the same database transaction as the originating business event. SMTP availability MUST NOT roll back a valid business transition.

#### Scenario: SMTP is offline during moderation

- **WHEN** a status transition commits and immediate delivery cannot connect
- **THEN** the outbox item remains pending/failed according to retry policy and the business state remains committed

### Requirement: Email delivery is idempotent and retryable

Every application message SHALL have a stable idempotency key derived from the business event/template/recipient, bounded attempt count, exponential retry schedule, and safe terminal-failure state. Duplicate commands MUST NOT send duplicate messages.

#### Scenario: Worker processes same item twice

- **WHEN** concurrent or repeated processing targets one outbox item
- **THEN** locking/idempotency permits at most one successful delivery record

#### Scenario: Maximum attempts are exhausted

- **WHEN** delivery continues failing through the configured attempt limit
- **THEN** the item becomes visibly failed for administrator action without infinite retry

### Requirement: Scheduled and manual processing is authenticated

The system SHALL protect the scheduled outbox processing endpoint with a strong environment secret/signature and SHALL protect manual retry with `ADMIN` authorization.

#### Scenario: Unsigned caller invokes scheduled processing

- **WHEN** a request lacks the correct operational signature
- **THEN** the system rejects it without disclosing outbox data

### Requirement: Local email is captured safely

The local environment SHALL route Supabase Auth and application messages to local email catchers so tests never contact real recipients. Development messages SHALL be clearly identifiable as non-production.

#### Scenario: Developer runs end-to-end registration locally

- **WHEN** confirmation and moderation messages are generated
- **THEN** they are inspectable in local catchers and no external SMTP recipient is contacted

### Requirement: Delivery telemetry is data-minimized

The system SHALL record template key, recipient reference, timestamps, provider-safe response category, and redacted error metadata. It MUST NOT log SMTP credentials, Auth tokens, password links, or full sensitive email bodies.

#### Scenario: SMTP returns an error containing recipient data

- **WHEN** the adapter records the failure
- **THEN** logs/audit expose only approved redacted metadata while the restricted outbox retains the minimum retry data

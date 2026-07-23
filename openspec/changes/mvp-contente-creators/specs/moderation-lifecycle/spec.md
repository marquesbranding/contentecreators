## ADDED Requirements

### Requirement: Moderation follows the defined account state machine

The system SHALL permit only the transitions `ONBOARDING → PENDING_REVIEW`, `PENDING_REVIEW → APPROVED | CHANGES_REQUESTED | BANNED`, `CHANGES_REQUESTED → PENDING_REVIEW | BANNED`, `APPROVED → SUSPENDED | BANNED`, and `SUSPENDED → APPROVED | BANNED`. Other transitions MUST be rejected unless an explicit audited administrator recovery operation exists.

#### Scenario: Invalid direct transition is attempted

- **WHEN** a caller attempts `ONBOARDING → APPROVED` or another undefined transition
- **THEN** the system rejects the mutation and preserves the prior state

### Requirement: Complete onboarding submission enters manual review

The system SHALL validate the role-specific profile, verified identity, current consent, and non-banned identity before transitioning an account from `ONBOARDING` or `CHANGES_REQUESTED` to `PENDING_REVIEW`.

#### Scenario: First valid submission succeeds

- **WHEN** an `ONBOARDING` account submits complete valid data
- **THEN** the status becomes `PENDING_REVIEW`, a moderation case/event exists, and the account enters the correct queue

#### Scenario: Incomplete submission is attempted

- **WHEN** required review data is missing or invalid
- **THEN** status remains unchanged and the system reports actionable validation errors

### Requirement: Pending accounts enter the product shell without catalog data

The system SHALL allow a `PENDING_REVIEW` account to authenticate and enter the product shell, but it MUST replace catalog list/detail content with the message “Seu cadastro está sendo analisado” and MUST NOT issue catalog queries for that request.

#### Scenario: Pending user opens catalog

- **WHEN** a `PENDING_REVIEW` user requests a catalog or creator detail route
- **THEN** the system renders the analysis fallback and returns no listing DTO

### Requirement: Administrators can request corrections with a reason

The system SHALL allow an `ADMIN` reviewing a pending submission to transition it to `CHANGES_REQUESTED` with a mandatory user-visible correction reason and immutable moderation event.

#### Scenario: Admin requests corrections

- **WHEN** an administrator supplies a non-empty valid reason and confirms the action
- **THEN** status becomes `CHANGES_REQUESTED`, the reason is visible to the owner, and notification intent is queued

#### Scenario: Admin omits correction reason

- **WHEN** an administrator attempts a correction request without a reason
- **THEN** the system rejects the transition

### Requirement: Users can correct and resubmit requested changes

The system SHALL allow only the owner of a `CHANGES_REQUESTED` account to edit the requested profile and resubmit it to `PENDING_REVIEW`. Resubmission SHALL preserve prior moderation events and create a new submission sequence/event.

#### Scenario: Owner resubmits corrections

- **WHEN** the owner addresses validation requirements and confirms resubmission
- **THEN** status returns to `PENDING_REVIEW`, the queue reflects the new submission, and previous reasons remain in history

#### Scenario: Different user attempts correction

- **WHEN** another account attempts to edit or resubmit the profile
- **THEN** the system denies access

### Requirement: Administrators can approve legitimate profiles

The system SHALL allow an authorized administrator to approve a complete `PENDING_REVIEW` profile after reviewing full submitted data. Approval SHALL record actor/time, update approval time, make the profile catalog-eligible, and queue the approval notification.

#### Scenario: Admin approves complete pending profile

- **WHEN** an administrator confirms approval of a valid `PENDING_REVIEW` account
- **THEN** status becomes `APPROVED`, approval metadata is recorded, and authorized catalog queries can include the profile

#### Scenario: Admin attempts approval from stale review

- **WHEN** the reviewed profile version differs from the current submitted version
- **THEN** the system refuses approval until the administrator reloads the latest submission

### Requirement: Administrators can suspend and restore approved accounts

The system SHALL allow an administrator to transition `APPROVED → SUSPENDED` with a mandatory reason and `SUSPENDED → APPROVED` with a mandatory restoration reason. Suspended profiles MUST disappear from all listings and contacts immediately.

#### Scenario: Approved account is suspended

- **WHEN** an administrator confirms suspension with a reason
- **THEN** active sessions lose catalog authorization and the profile is excluded from catalog/company carousel results

#### Scenario: Suspended account is restored

- **WHEN** an administrator confirms restoration with a reason
- **THEN** status returns to `APPROVED` and catalog eligibility is restored

### Requirement: Banning is terminal for self-service activity

The system SHALL allow an administrator to transition any moderated state to `BANNED` with a mandatory reason and confirmation. A banned identity MUST NOT edit, resubmit, use the catalog, or recreate through the same known identity. Any administrative unban is an exceptional audited recovery operation.

#### Scenario: Account is banned

- **WHEN** an administrator confirms a ban with a reason
- **THEN** status becomes `BANNED`, catalog visibility is removed, sessions are revoked where supported, and blocked identity protection is established

#### Scenario: Banned owner attempts resubmission

- **WHEN** a banned owner invokes an onboarding/profile submission directly
- **THEN** the system rejects the operation without modifying business data

### Requirement: Profile visibility is derived from current status and archive state

The system MUST include a profile in catalog or company-carousel results only when its account is `APPROVED`, its profile is complete enough for the requested presentation, and neither account nor profile is archived.

#### Scenario: Status changes during a cached catalog window

- **WHEN** an approved profile becomes suspended, banned, or archived
- **THEN** relevant caches are invalidated and subsequent authorized catalog responses omit it

### Requirement: Moderation transitions are atomic and idempotent

The system SHALL update status, moderation event, audit revision, blocked identity when applicable, and email-outbox intent in one transaction. Repeating the same command with the same idempotency key MUST NOT duplicate transitions or notifications.

#### Scenario: Notification provider is unavailable during approval

- **WHEN** the approval transaction succeeds but immediate SMTP delivery fails
- **THEN** the account remains approved and exactly one pending outbox item remains retryable

#### Scenario: Administrator double-submits approval

- **WHEN** the same approval command is received twice with one idempotency key
- **THEN** only one state transition, event, revision, and notification intent exists

### Requirement: Moderation history is immutable and ordered

The system SHALL preserve every submission, correction request, resubmission, approval, suspension, restoration, ban, and exceptional unban as an ordered immutable history with actor, timestamp, from/to states, and reason where applicable.

#### Scenario: Admin reviews a previously corrected account

- **WHEN** the moderation history is opened
- **THEN** all prior state changes appear chronologically and cannot be edited or deleted through the application

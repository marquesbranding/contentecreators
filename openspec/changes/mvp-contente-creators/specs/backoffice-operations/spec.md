## ADDED Requirements

### Requirement: Multiple administrators can operate one protected backoffice

The system SHALL support more than one `ADMIN` in the same Supabase Auth/application environment. Every backoffice page, read, and mutation SHALL enforce current `ADMIN` authorization server-side.

#### Scenario: Two authorized admins work concurrently

- **WHEN** two distinct administrators access permitted backoffice areas
- **THEN** each receives authorized data and every mutation is attributed to the correct actor

#### Scenario: Admin role is revoked mid-session

- **WHEN** an account loses `ADMIN` while retaining an Auth session
- **THEN** the next protected read/write is denied and backoffice data is cleared from the response

### Requirement: Dashboard exposes basic operational metrics

The backoffice SHALL show total influencers and companies by relevant status, new registrations over a selected period, profile completion rate, and number awaiting approval. Metrics SHALL use consistent definitions and exclude archived data unless explicitly labeled.

#### Scenario: Admin selects a reporting period

- **WHEN** an administrator selects a supported period
- **THEN** new-registration metrics update to that period while totals/status counts remain correctly labeled

#### Scenario: Completion rate is shown

- **WHEN** the dashboard calculates profile completion
- **THEN** it uses the same role-specific completion service/version used by profile screens

### Requirement: Moderation queues separate influencer and company submissions

The system SHALL provide paginated influencer and company queue views with status/search filters, submitted time, completion summary, and ordering that makes pending work clear.

#### Scenario: Admin opens company queue

- **WHEN** an administrator selects company moderation
- **THEN** only relevant company submissions matching current filters are returned

### Requirement: Administrators review complete submitted data before decisions

The system SHALL provide a review page containing the submitted role-specific profile, media, consent/version summary, CNPJ lookup disclaimer, relevant moderation history, and current version before enabling a decision.

#### Scenario: Admin opens a pending creator

- **WHEN** the review page loads for a pending creator
- **THEN** all fields required to make the manual legitimacy/content decision are presented without exposing auth secrets

### Requirement: Backoffice exposes controlled moderation actions

The system SHALL provide approve, request corrections, suspend, restore, ban, exceptional unban, and archive controls only where allowed by the state machine. Required reasons, confirmations, stale-version checks, audit, and email intent SHALL be enforced.

#### Scenario: Admin attempts an unavailable action

- **WHEN** an action is invalid for the current account state
- **THEN** the control is unavailable in the UI and a direct request is rejected server-side

### Requirement: Administrators manage all accounts without hard deletion

The system SHALL provide paginated account search and filters by role/status, full authorized profile view, permitted profile editing, suspension/ban operations, and soft archive/removal. Normal backoffice operations MUST NOT hard-delete accounts, profiles, moderation history, or audit revisions.

#### Scenario: Admin removes an obsolete account

- **WHEN** an administrator confirms archive/removal with the required reason
- **THEN** the account/profile is soft archived, hidden from catalog, and remains available to authorized audit/history views

### Requirement: Backoffice supports sponsorship operations

The system SHALL expose placement list, filters, create/edit/preview, scheduling, activation, ordering, and soft removal using the sponsorship capability’s validation and authorization rules.

#### Scenario: Admin previews scheduled placement

- **WHEN** an administrator opens preview for a valid placement
- **THEN** the backoffice renders the responsive creative without making it publicly active

### Requirement: Backoffice exposes audit and email operational views

The system SHALL provide paginated/filterable audit history and failed/pending email-outbox views. Admins MAY retry eligible failed application messages, but MUST NOT edit immutable audit records or silently duplicate messages.

#### Scenario: Admin retries failed message

- **WHEN** an administrator confirms retry for an eligible failed outbox item
- **THEN** the same idempotent message is scheduled for another attempt and the action is audited

### Requirement: Backoffice is usable on mobile and desktop

The system SHALL provide touch-friendly navigation, filters, actions, dialogs, and card/list alternatives for wide tables. It MUST NOT require desktop-only hover or horizontal scrolling as the sole way to operate a critical flow.

#### Scenario: Admin moderates from a phone

- **WHEN** the moderation queue and review page render at 320–390 px
- **THEN** the administrator can inspect required data and complete an allowed action with accessible confirmations

### Requirement: Beta moderation remains individual rather than bulk

The system SHALL NOT provide bulk approval or bulk banning in the Beta. Data access and UI architecture SHALL use pagination and reusable commands so a future reviewed bulk workflow is not blocked.

#### Scenario: Admin selects multiple queue rows

- **WHEN** the Beta queue is rendered
- **THEN** no bulk approval/ban action is offered

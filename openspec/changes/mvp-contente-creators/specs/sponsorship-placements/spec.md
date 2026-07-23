## ADDED Requirements

### Requirement: Administrators manage supported placement types

The system SHALL allow an `ADMIN` to create, view, edit, preview, activate/deactivate, and soft-remove top banner, side banner, carousel, and featured-creator placements.

#### Scenario: Admin creates a valid top banner

- **WHEN** an administrator supplies valid audience, creative, schedule, link, and ordering data
- **THEN** the placement is saved as an auditable draft or active record according to the requested state

#### Scenario: Normal user calls sponsorship mutation

- **WHEN** an `INFLUENCER` or `COMPANY` invokes a sponsorship mutation directly
- **THEN** the system rejects the request before changing data or storage

### Requirement: Placement creatives are validated

The system SHALL validate title/body lengths, supported private media asset, safe HTTP(S) link, audience, route/slot compatibility, and referenced profile eligibility before activation.

#### Scenario: Admin provides unsafe link scheme

- **WHEN** a creative link uses `javascript:`, `data:`, or another disallowed scheme
- **THEN** activation is rejected with actionable validation feedback

#### Scenario: Creative is incomplete

- **WHEN** a placement lacks fields required by its type
- **THEN** it can remain a draft but cannot become active

### Requirement: Placement visibility honors active state and schedule

The system SHALL render a placement only when it is active, not soft-removed, within inclusive start/end rules, and eligible for the current route and audience. Time comparisons SHALL use UTC storage and `pt-BR` display.

#### Scenario: Placement is before its start time

- **WHEN** an otherwise valid placement has not reached `starts_at`
- **THEN** it is omitted from the rendered slot

#### Scenario: Placement passes its end time

- **WHEN** current time is later than `ends_at`
- **THEN** it is omitted without requiring a manual deactivation

### Requirement: Administrators control deterministic order

The system SHALL support explicit manual ordering within a placement type/audience/slot and SHALL use a deterministic secondary order for ties.

#### Scenario: Admin reorders carousel items

- **WHEN** an administrator saves a new valid order
- **THEN** subsequent eligible views display items in that order
- **AND** the change is audited

### Requirement: Placements are audience and route aware

The system SHALL distinguish public, approved-influencer, approved-company, and shared approved audiences and SHALL suppress placements that do not match the viewer/route authorization.

#### Scenario: Company-only placement is requested by influencer

- **WHEN** an approved influencer opens a route containing that slot
- **THEN** the company-only placement is not returned

### Requirement: Sponsorship cannot bypass profile privacy

The system MUST NOT render participant-derived public creatives while public social proof is disabled and MUST NOT render referenced profiles that are unapproved, suspended, banned, or archived.

#### Scenario: Referenced featured creator becomes banned

- **WHEN** an active featured-creator placement is evaluated after the creator is banned
- **THEN** the placement is suppressed automatically

#### Scenario: Public placement exposes protected company logo

- **WHEN** a public creative derives from a protected company profile while public social proof is disabled
- **THEN** the system refuses or suppresses the placement

### Requirement: Sponsorship remains non-transactional

The system MUST NOT store or process sponsorship prices, checkout, payment, commission, split, escrow, invoice, entitlement, or automatic renewal. The backoffice MAY retain only operational presentation metadata and an optional non-financial internal note.

#### Scenario: Admin manages an externally sold placement

- **WHEN** a commercial agreement is completed outside the system
- **THEN** the admin can schedule its creative without recording payment in the application

### Requirement: Sponsorship media is private and versioned

The system SHALL store sponsorship creative media in the private sponsorship bucket, validate admin ownership/type/size, and archive replaced assets rather than overwriting historical bytes.

#### Scenario: Admin replaces banner image

- **WHEN** an administrator uploads and activates a valid replacement
- **THEN** the new asset is used for future rendering and the previous asset remains referenceable by audit history

### Requirement: Placement rendering adapts to mobile layouts

The system SHALL transform desktop side placements into deliberate inline/mobile slots and MUST NOT force unreadable sidebars or horizontal page scrolling.

#### Scenario: Side placement renders on a phone

- **WHEN** an eligible catalog page is displayed at a narrow viewport
- **THEN** the placement appears in the configured inline mobile position with accessible creative and link behavior

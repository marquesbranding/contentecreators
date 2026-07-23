## ADDED Requirements

### Requirement: Influencer onboarding collects review-ready data

The system SHALL provide an `INFLUENCER` onboarding form that collects name, verified email, WhatsApp, exactly one creator type (`INFLUENCER` or `UGC`), city/UF, niches, social links, self-reported metrics, bio, avatar, cover, and required legal consent. The system SHALL distinguish fields required for first moderation from optional profile-completion fields.

#### Scenario: Influencer submits a complete profile

- **WHEN** an influencer supplies every required review field with valid values and accepts current legal documents
- **THEN** the profile can be submitted for moderation

#### Scenario: Influencer chooses both creator types

- **WHEN** the submitted creator type contains both `INFLUENCER` and `UGC` or more than one value
- **THEN** the system rejects the submission and asks for exactly one type

### Requirement: Company onboarding collects review-ready data

The system SHALL provide a `COMPANY` onboarding form that collects legal name, CNPJ, employee-count range, segment, verified email, WhatsApp, trade name when applicable, description, website/social links, one or more locations, logo, cover, and required legal consent. The system SHALL distinguish review-required and optional completion fields.

#### Scenario: Company submits a complete profile

- **WHEN** a company supplies valid required review fields and accepts current legal documents
- **THEN** the profile can be submitted for moderation

#### Scenario: Company submits malformed CNPJ

- **WHEN** a company submits a CNPJ that fails local checksum validation
- **THEN** the system rejects the form before moderation submission

### Requirement: CNPJ lookup assists but never verifies a company

The system SHALL provide authenticated server-side BrasilAPI lookup after a complete checksum-valid CNPJ is entered. It SHALL show loading, success, not-found, unavailable, timeout, and manual-entry states. Returned fields SHALL remain editable and MUST NOT change moderation status or establish legitimacy.

#### Scenario: Lookup succeeds

- **WHEN** BrasilAPI returns a valid company response within the timeout
- **THEN** the system proposes mapped legal/trade name, address/city/UF, and activity information
- **AND** the user can review and edit every proposed form field

#### Scenario: Lookup is unavailable

- **WHEN** BrasilAPI times out, rejects, or returns an unusable response
- **THEN** the form explains that automatic completion is unavailable
- **AND** the user can continue through manual entry

#### Scenario: Admin reviews autofilled company

- **WHEN** an autofilled company reaches moderation
- **THEN** the system still labels approval as manual and provides no automatic verification assertion

### Requirement: CNPJ lookup is normalized, rate-limited, and data-minimized

The system SHALL normalize and checksum-validate CNPJ before provider access, apply authenticated rate limits and bounded caching, map the provider response to a minimal internal DTO, and avoid persisting the raw provider payload.

#### Scenario: Caller floods lookup endpoint

- **WHEN** an account exceeds the configured lookup threshold
- **THEN** the system returns a typed rate-limit response without calling BrasilAPI again

#### Scenario: Provider returns additional sensitive/unneeded fields

- **WHEN** the adapter receives fields outside the approved mapping
- **THEN** those fields are discarded and do not enter profile or audit storage

### Requirement: Onboarding drafts preserve progress safely

The system SHALL save role-appropriate onboarding drafts for the authenticated owner, validate every save on the server, and use optimistic concurrency so a stale tab cannot silently overwrite a newer draft.

#### Scenario: User returns to an incomplete onboarding form

- **WHEN** a user with `ONBOARDING` status returns after saving valid progress
- **THEN** the form restores that account’s latest safe draft

#### Scenario: Stale draft is submitted

- **WHEN** a form version is older than the persisted profile version
- **THEN** the system refuses the overwrite and asks the user to reload/reconcile

### Requirement: Profile validation is shared and typed

The system SHALL use one typed validation contract per form on client and server for required fields, lengths, URLs, CNPJ, email, WhatsApp, percentages, follower counts, and enum values. Server validation remains authoritative.

#### Scenario: Client validation is bypassed

- **WHEN** a caller submits malformed or out-of-range values directly to a Server Action
- **THEN** server validation rejects the request with field-safe `pt-BR` feedback

### Requirement: Profiles support role-specific locations and social data

The system SHALL support one primary city/UF for creators, multiple labeled locations for companies, multiple normalized social profiles, and dated self-reported metric snapshots for creators.

#### Scenario: Company adds multiple cities

- **WHEN** a company adds valid locations and designates one primary location
- **THEN** all locations are retained and exactly one is primary

#### Scenario: Creator adds social metrics

- **WHEN** a creator records followers or engagement for a supported platform
- **THEN** the metric is stored as a dated `SELF_REPORTED` snapshot associated with that platform

### Requirement: Media uploads use private owner-scoped storage

The system SHALL upload avatar, logo, cover, and applicable profile media to private Supabase Storage paths owned by the account. It SHALL validate ownership, status, MIME/type, size, and supported image format before activation.

#### Scenario: Owner uploads valid avatar

- **WHEN** an authenticated profile owner uploads a supported image within the limit
- **THEN** the system creates a new media asset and associates it with the profile

#### Scenario: User writes to another account path

- **WHEN** an authenticated user attempts to upload, replace, or delete media owned by another account
- **THEN** Storage policy and server authorization deny the operation

#### Scenario: Owner replaces profile media

- **WHEN** an owner replaces an active avatar/logo/cover
- **THEN** a new object becomes active and the prior asset is archived rather than overwritten in place

### Requirement: Profile completion is deterministic and visible

The system SHALL calculate profile completion from a documented role-specific field weighting and SHALL show the percentage plus missing-field guidance to the owner. The same calculation SHALL power admin completion metrics.

#### Scenario: User completes an optional field

- **WHEN** a valid missing weighted field becomes complete
- **THEN** the displayed completion percentage increases according to the shared calculation

#### Scenario: Admin views completion metric

- **WHEN** an administrator inspects an account or aggregate completion rate
- **THEN** the value uses the same calculation version as the user profile

### Requirement: Approved users can edit profiles without losing approval

The system SHALL allow an `APPROVED` profile owner to update permitted profile fields and media without returning to moderation. Each accepted change MUST be validated and audited; administrators retain suspend/ban authority.

#### Scenario: Approved creator updates biography

- **WHEN** an approved creator submits a valid biography change
- **THEN** the change becomes visible in authorized catalog responses immediately
- **AND** the account remains `APPROVED`
- **AND** an audit revision records the change

### Requirement: Submission captures versioned consent atomically

The system SHALL require acceptance of the active Terms of Use and Privacy Policy, recording document versions/hashes and timestamp in the same successful submission workflow. Consent checkboxes MUST NOT be preselected.

#### Scenario: User submits without current consent

- **WHEN** a user has not explicitly accepted the current required legal documents
- **THEN** moderation submission is rejected and no false consent record is created

#### Scenario: Submission succeeds

- **WHEN** all profile requirements and consent are valid
- **THEN** profile submission, consent records, moderation state, audit, and notification intent are committed consistently

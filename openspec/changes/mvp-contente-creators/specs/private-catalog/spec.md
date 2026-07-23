## ADDED Requirements

### Requirement: Catalog data is available only to approved authenticated accounts

The system SHALL authorize every catalog list/detail query against a validated authenticated account with status `APPROVED`. Anonymous and non-approved callers MUST receive no catalog DTOs.

#### Scenario: Anonymous caller requests catalog data

- **WHEN** no valid identity is present
- **THEN** the system requires authentication and returns no catalog records

#### Scenario: Non-approved authenticated caller invokes catalog action directly

- **WHEN** an `ONBOARDING`, `PENDING_REVIEW`, `CHANGES_REQUESTED`, `SUSPENDED`, or `BANNED` account calls a catalog read endpoint/action
- **THEN** the DAL rejects the data request

### Requirement: Companies discover approved creators

The system SHALL provide approved `COMPANY` accounts with a grid/list of approved, non-archived creators and individual creator detail pages.

#### Scenario: Approved company opens catalog

- **WHEN** an approved company requests the default catalog page
- **THEN** the system returns the first bounded page of eligible creator cards and applicable placements

### Requirement: Influencers discover other approved creators and companies

The system SHALL provide approved `INFLUENCER` accounts with approved creator results excluding the viewer’s own profile and an authenticated carousel of approved company logos. It MUST NOT expose company CNPJ, private contacts, or moderation data.

#### Scenario: Influencer opens catalog

- **WHEN** an approved influencer requests the catalog
- **THEN** eligible creators other than the viewer are returned
- **AND** eligible approved company carousel DTOs are returned

#### Scenario: Influencer inspects company carousel payload

- **WHEN** the company carousel is returned to an approved influencer
- **THEN** it contains only approved display name/logo/link-safe presentation fields

### Requirement: Catalog supports required search and filters

The system SHALL support accent-insensitive creator-name search and filters for niche, social network, city/UF, and exactly one creator type (`INFLUENCER` or `UGC`). Filters SHALL compose and be represented in the URL.

#### Scenario: Company combines filters

- **WHEN** a company searches a name and selects niche, city, and creator type
- **THEN** every returned creator matches all active criteria and URL state reflects the selection

#### Scenario: Search omits accents or case

- **WHEN** the query differs only by Portuguese accents or letter case from a creator name
- **THEN** the matching eligible creator can still be found

### Requirement: Catalog results are paginated and bounded

The system SHALL use stable server-side cursor pagination with a documented default and maximum page size. It MUST NOT load the entire eligible catalog into the browser.

#### Scenario: More results exist

- **WHEN** a page reaches its limit and additional eligible records exist
- **THEN** the response includes a safe next cursor and stable ordering

#### Scenario: Caller requests excessive page size

- **WHEN** a caller requests more than the maximum page size
- **THEN** the server clamps or rejects the request without excessive database work

### Requirement: Creator cards and details expose minimal approved fields

The system SHALL return dedicated card/detail DTOs containing only presentation-approved name, creator type, bio excerpt/detail, city/UF, niches, social presentation, self-reported metrics labels, and authorized media. It MUST NOT serialize raw account, audit, blocked identity, or moderation rows.

#### Scenario: Catalog detail is rendered

- **WHEN** an approved viewer opens an eligible creator detail
- **THEN** the view uses a minimal role-appropriate DTO and labels self-reported metrics accurately

### Requirement: Creator contact actions are company-only and consent-aware

The system SHALL expose creator WhatsApp, contact email, and approved social contact actions only to an approved `COMPANY` and only when the creator has accepted the applicable contact visibility consent. Influencer viewers MUST NOT receive private contact fields.

#### Scenario: Approved company contacts consenting creator

- **WHEN** the creator permits contact visibility and an approved company opens the detail
- **THEN** safe WhatsApp/email/social actions are displayed

#### Scenario: Influencer requests another creator’s contact DTO

- **WHEN** an approved influencer calls the same detail data path
- **THEN** private WhatsApp/email fields are omitted regardless of UI manipulation

#### Scenario: Creator has not consented to contact visibility

- **WHEN** an approved company opens that creator’s detail
- **THEN** direct private contact actions are omitted and the UI explains unavailability without exposing data

### Requirement: Catalog excludes ineligible records immediately

The system SHALL omit pending, changes-requested, suspended, banned, incomplete-for-display, and archived accounts from list, search, filter, detail, carousel, count, and sponsorship-derived profile results.

#### Scenario: Previously approved creator is suspended

- **WHEN** a viewer requests a list or saved creator detail after suspension
- **THEN** the creator is absent and the detail returns a safe unavailable/not-found experience

### Requirement: Catalog provides complete interaction states

The system SHALL provide accessible loading skeletons, filter-loading indicators, empty results, first-catalog-empty guidance, recoverable errors, retry controls, and mobile filter sheets without leaking records from a prior authorized state.

#### Scenario: Filter returns no results

- **WHEN** no eligible creator matches all filters
- **THEN** the UI shows a `pt-BR` no-results message and clear-filter action

#### Scenario: Catalog request fails after stale data was visible

- **WHEN** authorization or network status changes during navigation
- **THEN** stale protected cards are removed and a safe status/error state is displayed

### Requirement: Sponsorships integrate without changing catalog eligibility

The catalog SHALL render only active, scheduled, audience-compatible sponsorship placements in defined slots. Sponsorship status MUST NOT make an unapproved creator/company profile catalog-visible.

#### Scenario: Featured creator is not approved

- **WHEN** an active placement references a creator who is no longer eligible
- **THEN** the placement is suppressed and no protected profile is exposed

### Requirement: Catalog UI is mobile-first and keyboard accessible

The system SHALL keep cards, filters, pagination, detail actions, and promotional placements usable at narrow widths and by keyboard/screen reader, with no desktop-only dependency.

#### Scenario: Mobile user opens filters

- **WHEN** the catalog is rendered at a narrow viewport and the user opens filters
- **THEN** an accessible touch-friendly filter surface opens, preserves selections, and can be closed without losing context

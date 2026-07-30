## ADDED Requirements

### Requirement: The product provides a content-led public landing page

The system SHALL provide a public Brazilian Portuguese landing page in the same Next.js project as the authenticated application and backoffice. It SHALL include a brand header, value proposition, separate influencer and company paths, benefit/problem framing, a three- or four-step “Como funciona” section, final call to action, and footer.

#### Scenario: Anonymous visitor opens the landing page

- **WHEN** an anonymous visitor requests the root URL
- **THEN** the system renders the complete public landing page without requiring authentication
- **AND** all visible product copy is polished `pt-BR`

#### Scenario: Application services are unavailable

- **WHEN** Supabase Auth, Postgres, user provisioning, or another Next.js backend capability is unavailable
- **THEN** the root landing page remains available as prerendered static content
- **AND** rendering the static shell performs no request-time Auth, database, sponsorship, or user lookup
- **AND** optional aggregate or promotional client enhancements fail closed and independently without replacing the landing
- **AND** native navigation links to registration and login remain visible and operable

### Requirement: Audience calls to action preserve registration intent

The system SHALL provide “Sou influencer” and “Sou empresa” calls to action that lead to a combined email/password and role-specific profile registration form. The selected intent SHALL control the visible form variant but SHALL remain untrusted until the server validates it and successfully creates the Auth identity plus application profile.

#### Scenario: Company visitor starts registration

- **WHEN** a visitor activates the “Sou empresa” call to action
- **THEN** the system opens the combined registration flow with the company variant selected
- **AND** the same submission contains credentials and company profile data

#### Scenario: Influencer visitor starts registration

- **WHEN** a visitor activates the “Sou influencer” call to action
- **THEN** the system opens the combined registration flow with the influencer variant selected
- **AND** the same submission contains credentials and creator profile data

### Requirement: Public profile and company listings remain disabled

The system MUST NOT query, return, or render creator listings, creator cards, creator names, creator photos, creator metrics, company names, or company logos on public routes while public social proof is disabled.

#### Scenario: Anonymous visitor inspects the landing page

- **WHEN** public social proof is disabled
- **THEN** the landing page contains no participant-derived creator or company listing data

#### Scenario: Public page request bypasses the UI

- **WHEN** an anonymous caller requests a public route or payload that could expose catalog records
- **THEN** the system returns no private catalog data

### Requirement: Public counters are aggregate and non-identifying

The landing page MAY load aggregate counts such as approved creators or companies after the static shell is visible. Values SHALL come from an isolated optional public endpoint and a bounded aggregate DTO with no names, logos, cards, profile links, or drill-down. Empty, unavailable, misleading, invalid, or unapproved counters SHALL be hidden without affecting another landing section.

#### Scenario: Approved aggregate counter is available

- **WHEN** a configured counter has a meaningful approved aggregate value
- **THEN** the landing page may display the count without exposing any participant identity or catalog payload

#### Scenario: Counter has no approved meaningful value

- **WHEN** the aggregate is empty, unavailable, or below its approved display condition
- **THEN** the landing page omits the counter rather than showing misleading proof

### Requirement: Public social proof cannot be enabled accidentally

The system SHALL keep `publicSocialProofEnabled` false by default and SHALL NOT expose a Beta backoffice control that enables participant listings publicly. Enabling it requires a future reviewed specification and consent analysis.

#### Scenario: Administrator manages normal landing content

- **WHEN** an administrator updates a sponsorship or other supported landing content
- **THEN** public social proof remains disabled
- **AND** no profile/company listing control is available

### Requirement: Public promotional placements respect privacy

The landing page MAY load an active generic top promotional placement after the static shell is visible, but that isolated optional request MUST NOT use private participant-derived fields or bypass public social-proof restrictions. Failure to load the placement SHALL hide only that placement.

#### Scenario: Eligible generic promotion is active

- **WHEN** a valid public promotion is active and within its schedule
- **THEN** the landing page renders the configured creative and safe external link
- **AND** no protected profile DTO is loaded

#### Scenario: Public creative references protected profile data

- **WHEN** a public placement would reveal a protected creator/company profile while public social proof is disabled
- **THEN** the system rejects or suppresses that placement

### Requirement: Public pages provide legal and support navigation

The system SHALL expose public Terms of Use and Privacy Policy routes and SHALL provide footer navigation to those routes and an approved support/privacy contact.

#### Scenario: Visitor opens legal information

- **WHEN** a visitor activates a legal footer link
- **THEN** the corresponding versioned `pt-BR` legal document is accessible without login

### Requirement: Public pages are discoverable and shareable

The system SHALL provide unique metadata, canonical URL, Open Graph data, meaningful page title/description, favicon/brand assets, and robots/sitemap behavior appropriate to public routes while protected routes remain non-indexable.

#### Scenario: Search crawler requests metadata

- **WHEN** a crawler requests a public marketing route
- **THEN** the response includes route-appropriate metadata and canonical information
- **AND** no authenticated catalog content appears in metadata

### Requirement: The landing experience is mobile-first and accessible

The system SHALL work without horizontal page scrolling from 320 px upward, preserve readable hierarchy and touch targets, support keyboard/focus navigation, reduced motion, semantic landmarks, and WCAG 2.2 AA contrast.

#### Scenario: Visitor uses a narrow touch viewport

- **WHEN** the landing page is rendered at 320–390 px width
- **THEN** navigation, content, and calls to action remain readable and operable without horizontal page scrolling

#### Scenario: Visitor uses keyboard navigation

- **WHEN** a visitor traverses the page without a pointing device
- **THEN** every interactive element has a visible focus state and logical order

### Requirement: Login entry remains persistently discoverable

The landing page SHALL keep an accessible “Entrar” action readily discoverable throughout long/narrow layouts through the header and, when it does not obscure content, a sticky or floating mobile treatment.

#### Scenario: Mobile visitor scrolls the landing page

- **WHEN** the visitor is away from the hero on a narrow viewport
- **THEN** a clearly labeled login action remains easy to reach without covering content or trapping focus

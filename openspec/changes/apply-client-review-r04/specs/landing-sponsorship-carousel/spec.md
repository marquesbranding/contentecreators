## ADDED Requirements

### Requirement: Landing accepts multiple active banners

The `landing-top` sponsorship slot SHALL accept up to 5 simultaneously active banners, delivered in ascending `sortOrder`, and the public landing endpoint SHALL return them as a list.

#### Scenario: Two active banners

- **WHEN** two `landing-top` placements are active and eligible for the public audience
- **THEN** `GET /api/public/sponsorships/landing` returns both, ordered by `sortOrder`, and the landing renders both in the rotator

#### Scenario: No active banner

- **WHEN** no `landing-top` placement is active
- **THEN** the endpoint returns an empty list and the landing renders no sponsorship section

#### Scenario: Legacy single-object payload from cache

- **WHEN** the client receives a single placement object or `null` (cached response from before the deploy)
- **THEN** the client treats it as a list of one or an empty list and renders without error

### Requirement: Banners rotate automatically and accessibly

With two or more banners, the landing SHALL show one banner at a time, advance automatically every 6 seconds, and provide indicators to jump to any banner and a control to pause/resume.

#### Scenario: Automatic rotation

- **WHEN** the landing shows 3 banners and the visitor does not interact
- **THEN** the visible banner changes every 6 seconds and wraps from the last to the first

#### Scenario: Pause on hover or focus

- **WHEN** the pointer is over the banner area or keyboard focus is inside it
- **THEN** rotation stops until the pointer leaves and focus moves out

#### Scenario: Reduced motion

- **WHEN** the visitor has `prefers-reduced-motion: reduce`
- **THEN** banners do not advance automatically and change only through the indicators, without transition animation

#### Scenario: Single banner unchanged

- **WHEN** exactly one banner is active
- **THEN** it renders as today, with no indicators and no rotation

### Requirement: Backoffice describes the landing slot capacity

The sponsorship slot picker SHALL describe `landing-top` as accepting several banners in rotation.

#### Scenario: Slot picker label

- **WHEN** an admin opens the placement wizard position step
- **THEN** the "Banner na página inicial pública" option shows "Até 5, em rotação" instead of "1 por vez"

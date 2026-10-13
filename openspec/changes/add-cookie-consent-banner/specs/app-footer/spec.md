## MODIFIED Requirements

### Requirement: Authenticated app shell has a footer

Every page under the authenticated app shell SHALL render a footer containing links to the Terms of Use page, the Privacy Policy page, the cookie notice page, Contente Creators' social media accounts, and a "Preferências de cookies" control that opens the cookie preferences panel.

#### Scenario: User views any authenticated app page

- **WHEN** a user views a page under `/app/*`
- **THEN** a footer is visible with working links to `/terms`, `/privacy`, `/cookies`, and the brand's social media accounts, plus the "Preferências de cookies" control

#### Scenario: User reopens cookie preferences

- **WHEN** a user activates "Preferências de cookies" in the footer
- **THEN** the cookie preferences panel opens showing the current choice

# app-footer Specification

## Purpose
TBD - created by archiving change revise-catalog-home. Update Purpose after archive.
## Requirements
### Requirement: Authenticated app shell has a footer
Every page under the authenticated app shell SHALL render a footer containing links to the Terms of Use page, the Privacy Policy page, and Contente Creators' social media accounts.

#### Scenario: User views any authenticated app page
- **WHEN** a user views a page under `/app/*`
- **THEN** a footer is visible with working links to `/terms`, `/privacy`, and the brand's social media accounts


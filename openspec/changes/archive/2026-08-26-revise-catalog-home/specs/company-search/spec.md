## ADDED Requirements

### Requirement: Nav search finds companies by name or segment
The top navigation search bar in the authenticated app SHALL search companies by name or segment, and return matching company results.

#### Scenario: Search by company name
- **WHEN** a user types a company name into the nav search bar and submits
- **THEN** companies whose name matches the query are shown

#### Scenario: Search by segment
- **WHEN** a user types a segment/niche term into the nav search bar and submits
- **THEN** companies associated with that segment are shown

### Requirement: Companies grid has a dedicated filter bar
The companies catalog SHALL present a filter bar above the grid allowing filtering by segment, independent of the nav search bar.

#### Scenario: Filter by segment
- **WHEN** a user selects a segment in the companies grid's filter bar
- **THEN** the grid shows only companies matching that segment

### Requirement: "Empresas aprovadas" language is not shown
The companies section SHALL NOT use "aprovada(s)" language in its heading, subtitle, per-card badge, or accessibility labels, since every listed company is already approved.

#### Scenario: User views the companies section
- **WHEN** the companies grid/carousel renders
- **THEN** no visible or accessible text reads "Empresas aprovadas" or "Empresa aprovada"

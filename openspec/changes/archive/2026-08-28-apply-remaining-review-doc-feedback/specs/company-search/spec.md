## MODIFIED Requirements

### Requirement: Companies grid has a dedicated filter bar
The companies catalog SHALL present a filter bar above the grid allowing filtering by company name and by segment, independent of the nav search bar. The grid SHALL render exactly one heading (no duplicate heading above the filter bar).

#### Scenario: Filter by segment
- **WHEN** a user selects a segment in the companies grid's filter bar
- **THEN** the grid shows only companies matching that segment

#### Scenario: Filter by name
- **WHEN** a user types a company name into the companies grid's own search input and pauses
- **THEN** the grid shows only companies whose name matches the query

#### Scenario: User views the companies section
- **WHEN** the companies grid/carousel renders
- **THEN** only one heading is visible above the filter bar and grid (no duplicate "Empresas na comunidade" / "Marcas para conhecer" pair)

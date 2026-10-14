## ADDED Requirements

### Requirement: Catalog accepts multiple featured creators

The `catalog-featured` slot SHALL accept up to 10 active placements, each pointing to one approved creator, and the catalog SHALL render all eligible ones in `sortOrder`.

#### Scenario: Three featured creators

- **WHEN** three `catalog-featured` placements are active for the viewer's audience
- **THEN** the catalog shows the three creators' photo, name and profile link

#### Scenario: Single featured creator unchanged

- **WHEN** exactly one `catalog-featured` placement is active
- **THEN** it renders with the current featured-creator layout

### Requirement: Featured creators sit side by side and advance only when they overflow

Featured creators SHALL be laid out side by side; when they do not fit the available width, the row SHALL advance automatically every 5 seconds with the same pause, indicator and reduced-motion rules as the landing banner rotator.

#### Scenario: Fits the width

- **WHEN** the featured creators fit in the row at the current viewport width
- **THEN** they stay static with no automatic movement and no indicators

#### Scenario: Overflows the width

- **WHEN** there are more featured creators than fit in the row
- **THEN** the row advances one card every 5 seconds, wraps to the start, and pauses on hover or focus

#### Scenario: Reduced motion

- **WHEN** the viewer has `prefers-reduced-motion: reduce` and the row overflows
- **THEN** the row does not advance automatically and remains manually scrollable

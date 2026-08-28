## ADDED Requirements

### Requirement: Dropdown fields support search filtering
Single-choice dropdown fields backed by the shared `Combobox` component SHALL let the user type to filter the visible options by substring match, instead of only scrolling a static list.

#### Scenario: User filters a long option list
- **WHEN** a user opens a `Combobox` field (e.g. UF) and types part of an option's label
- **THEN** only options whose label matches the typed text remain visible

#### Scenario: No match found
- **WHEN** a user types text that matches no option
- **THEN** the field shows an empty/no-results state instead of an empty list with no feedback

### Requirement: Combobox is the default single-select dropdown
UF pickers, company segment, and company size fields SHALL use the searchable `Combobox` component instead of the plain `Select` component.

#### Scenario: Selecting a state
- **WHEN** a user opens the UF field and selects a state
- **THEN** the selected state is set as the field's value, matching the previous `Select`-based behavior

### Requirement: Combobox is keyboard and screen-reader accessible
The `Combobox` component SHALL follow the WAI-ARIA combobox pattern (typing filters, arrow keys navigate options, Enter selects, Escape closes) and expose accessible names/roles equivalent to the fields it replaces.

#### Scenario: Keyboard-only selection
- **WHEN** a user tabs to a `Combobox` field, types to filter, and uses arrow keys plus Enter
- **THEN** the desired option is selected without needing a pointer

## ADDED Requirements

### Requirement: Multi-select field supports search filtering and chip removal
The shared multi-select `Combobox` variant SHALL let the user type to filter options, select multiple options, see selections rendered as removable chips, and remove a selection by dismissing its chip.

#### Scenario: User selects multiple options via search
- **WHEN** a user types to filter and selects two or more options
- **THEN** each selected option appears as a chip, and the search field remains available to add more

#### Scenario: User removes a selection
- **WHEN** a user dismisses a selected option's chip
- **THEN** that option is deselected and no longer counted among the field's selected values

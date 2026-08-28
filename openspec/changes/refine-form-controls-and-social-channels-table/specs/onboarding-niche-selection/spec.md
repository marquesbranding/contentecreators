## ADDED Requirements

### Requirement: Niches are selected via a searchable multi-select field
The "Principais nichos" section SHALL present its options as a searchable multi-select `Combobox` field (type to filter, select multiple, selections shown as removable chips) instead of a checklist of individually rendered checkboxes.

#### Scenario: Creator filters and selects niches
- **WHEN** the creator types part of a niche name and selects it from the filtered results
- **THEN** the niche is added to the creator's selection and shown as a chip, and the search field remains available to add more (up to 5)

#### Scenario: Creator removes a selected niche
- **WHEN** the creator dismisses a selected niche's chip
- **THEN** that niche is removed from the creator's selection

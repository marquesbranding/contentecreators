## ADDED Requirements

### Requirement: Filter by CDL membership

The catalog filter dialog SHALL offer "Associado da CDL"; when active, the directory SHALL list only creators and companies with `is_cdl_member = true`, reflected in the URL as `cdl=1`.

#### Scenario: Apply CDL filter

- **WHEN** the viewer checks "Associado da CDL" and confirms
- **THEN** only CDL members are listed and the URL contains `cdl=1`

#### Scenario: Shared link

- **WHEN** a viewer opens a catalog URL containing `cdl=1`
- **THEN** the filter is pre-applied and shown as active

### Requirement: Filter by Influencer Journey participation

The catalog filter dialog SHALL offer "Fez a Jornada do Influenciador"; when active, the directory SHALL list only profiles with `is_influencer_journey_participant = true`, reflected in the URL as `jornada=1`.

#### Scenario: Apply Journey filter

- **WHEN** the viewer checks "Fez a Jornada do Influenciador" and confirms
- **THEN** only Journey participants are listed and the URL contains `jornada=1`

#### Scenario: Combine filters

- **WHEN** both badge filters and a type filter "Empresa" are active
- **THEN** only companies that are both CDL members and Journey participants are listed

#### Scenario: Clear filters

- **WHEN** the viewer clears the filters
- **THEN** `cdl` and `jornada` are removed from the URL and the pagination cursor resets

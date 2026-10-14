## ADDED Requirements

### Requirement: Directory order is shuffled daily

The catalog directory SHALL order companies and creators together by a deterministic pseudo-random key derived from the profile id and a daily seed (calendar date in America/Sao_Paulo plus a server-side salt), instead of by creation date.

#### Scenario: Same day, same order

- **WHEN** two viewers load the catalog with the same filters on the same day
- **THEN** both see the profiles in the same order

#### Scenario: Next day, new order

- **WHEN** the date changes in America/Sao_Paulo
- **THEN** the default order of the directory changes

#### Scenario: Oldest accounts no longer pinned to the top

- **WHEN** the catalog has profiles created on different dates
- **THEN** the first page is not ordered by creation date

### Requirement: Pagination stays consistent across the shuffle

The directory cursor SHALL carry the seed and the sort key of the last item, so "Carregar mais" never repeats nor skips a profile, even if the day changes mid-navigation.

#### Scenario: Load more across midnight

- **WHEN** a visitor loads page 1 at 23:59 and clicks "Carregar mais" at 00:01
- **THEN** page 2 continues the previous day's order with no duplicated or missing profiles

#### Scenario: Legacy cursor

- **WHEN** a request arrives with a cursor in the previous format (creation-date based)
- **THEN** the cursor is rejected as invalid and the first page of the current order is returned

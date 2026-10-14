## ADDED Requirements

### Requirement: Up to eight sponsored cards in the listing

The `catalog-midlist` slot SHALL accept up to 8 active placements, and the catalog SHALL insert one sponsored card after every 8 profiles of the accumulated listing.

#### Scenario: Eight active cards

- **WHEN** 8 `catalog-midlist` placements are active and eligible
- **THEN** all 8 are available to the listing; none is dropped by a hardcoded limit

### Requirement: Sponsored cards are shuffled per access

The order of sponsored cards SHALL be shuffled on the server on each catalog page request and remain stable while the visitor stays on that page (including "Carregar mais").

#### Scenario: New access, new order

- **WHEN** the visitor loads the catalog twice with 4 active cards
- **THEN** the card order is independently shuffled on each load

#### Scenario: Stable while paginating

- **WHEN** the visitor clicks "Carregar mais"
- **THEN** sponsored slots continue the same shuffled sequence without reshuffling

### Requirement: Cards rotate before repeating

Sponsored slots SHALL cycle through all shuffled cards before showing any card again; with two or more cards, the same card MUST NOT occupy two consecutive sponsored slots; with fewer cards than slots, the sequence restarts from the first shuffled card.

#### Scenario: Three cards, five slots

- **WHEN** 3 cards (A, B, C after shuffle) are active and the listing has 5 sponsored slots
- **THEN** the slots show A, B, C, A, B

#### Scenario: One card

- **WHEN** only one card is active
- **THEN** it appears in every sponsored slot

# onboarding-social-channels Specification

## Purpose
TBD - created by archiving change revamp-onboarding-form. Update Purpose after archive.
## Requirements
### Requirement: Multiple social networks can be declared
The "Audiência e canais" section SHALL present a table of social networks (Instagram, Facebook, YouTube, X, Threads, Telegram, LinkedIn, Outra), each row showing a brand icon (a generic icon for "Outra"), a checkbox, its own follower count field, and its own link field, allowing the creator to declare more than one channel with independent numbers per network.

#### Scenario: Creator declares two networks with different follower counts
- **WHEN** the creator checks Instagram with 45.000 seguidores and a link, and YouTube with 8.000 seguidores and a link
- **THEN** both channels are saved as separate entries, each with its own follower count and link

#### Scenario: Creator declares "Outra"
- **WHEN** the creator checks "Outra" and enters a network name, follower count, and link
- **THEN** the custom network name, follower count, and link are saved as a channel entry

### Requirement: At least one social channel is required
The form SHALL require at least one checked network with a non-empty link and a non-negative follower count before the creator can submit the cadastro.

#### Scenario: No network checked
- **WHEN** the creator attempts to submit with no network checked
- **THEN** the form shows a validation error and blocks submission

#### Scenario: Network checked without a follower count
- **WHEN** the creator checks a network, fills in the link, but leaves the follower count empty
- **THEN** the form shows a validation error for that channel and blocks submission

### Requirement: Threads and Telegram are supported platforms
The social platform options SHALL include Threads and Telegram alongside the previously supported networks.

#### Scenario: Creator selects Threads
- **WHEN** the creator checks Threads and provides a link
- **THEN** the channel is saved with platform `THREADS`


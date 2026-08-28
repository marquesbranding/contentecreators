# social-channel-primary-designation Specification

## Purpose
TBD - created by archiving change add-social-channel-follower-counts-and-primary. Update Purpose after archive.
## Requirements
### Requirement: Creator can mark one declared social channel as Principal
A creator SHALL be able to mark exactly one of their declared social channels as "Principal" using a star toggle. Marking a new channel as Principal SHALL automatically un-mark the previously Principal channel.

#### Scenario: Creator marks a second channel as Principal
- **WHEN** a creator with Instagram already marked Principal checks YouTube and marks YouTube as Principal
- **THEN** YouTube becomes the Principal channel and Instagram is no longer marked Principal

#### Scenario: At most one Principal channel is persisted
- **WHEN** the creator submits the form
- **THEN** exactly one of the creator's saved social channels has the Principal flag set, and the system rejects or corrects any attempt to persist more than one

### Requirement: A checked channel is auto-selected as Principal when none exists
When a creator checks a social channel and no channel is currently marked Principal, that channel SHALL become Principal automatically.

#### Scenario: First channel checked
- **WHEN** a creator checks Instagram as their first declared channel
- **THEN** Instagram is automatically marked Principal without requiring the creator to press the star

#### Scenario: Principal channel is unchecked
- **WHEN** a creator unchecks the channel currently marked Principal and at least one other channel remains checked
- **THEN** one of the remaining checked channels is automatically promoted to Principal

### Requirement: Catalog surfaces the creator's Principal channel
The creator catalog card and creator detail page SHALL display the metric row belonging to the creator's Principal social channel, falling back to any available metric row only when no channel is marked Principal.

#### Scenario: Catalog card shows the Principal channel's numbers
- **WHEN** a creator has declared Instagram (Principal, 45.000 seguidores) and X (12.000 seguidores)
- **THEN** the catalog card for that creator displays the Instagram metric

#### Scenario: No Principal channel marked (legacy/edge-case data)
- **WHEN** a creator profile has social channels but none flagged Principal
- **THEN** the catalog card falls back to displaying any one available channel's metric instead of showing nothing


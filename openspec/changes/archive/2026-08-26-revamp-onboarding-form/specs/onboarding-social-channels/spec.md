## ADDED Requirements

### Requirement: Multiple social networks can be declared
The "Audiência e canais" section SHALL present a checklist of social networks (Instagram, Facebook, YouTube, X, Threads, Telegram, LinkedIn, Outra), each with its own checkbox and link field, allowing the creator to declare more than one channel.

#### Scenario: Creator declares two networks
- **WHEN** the creator checks Instagram and YouTube and provides a profile link for each
- **THEN** both channels are saved as separate entries associated with the creator's profile

#### Scenario: Creator declares "Outra"
- **WHEN** the creator checks "Outra" and enters a network name and link
- **THEN** the custom network name and link are saved as a channel entry

### Requirement: At least one social channel is required
The form SHALL require at least one checked network with a non-empty link before the creator can submit the cadastro.

#### Scenario: No network checked
- **WHEN** the creator attempts to submit with no network checked
- **THEN** the form shows a validation error and blocks submission

### Requirement: Threads and Telegram are supported platforms
The social platform options SHALL include Threads and Telegram alongside the previously supported networks.

#### Scenario: Creator selects Threads
- **WHEN** the creator checks Threads and provides a link
- **THEN** the channel is saved with platform `THREADS`

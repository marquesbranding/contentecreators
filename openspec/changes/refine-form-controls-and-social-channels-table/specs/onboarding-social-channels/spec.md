## MODIFIED Requirements

### Requirement: Multiple social networks can be declared
The "Audiência e canais" section SHALL present a table of the fixed supported social networks (Instagram, Facebook, YouTube, X, Threads, Telegram, LinkedIn), each row showing a brand-colored icon, a checkbox, its own follower count field, and its own link field, allowing the creator to declare more than one channel with independent numbers per network. Free-text custom networks ("Outra") are no longer offered; creators who previously declared "Outra" keep that channel exactly as stored, unaffected by this change.

#### Scenario: Creator declares two networks with different follower counts
- **WHEN** the creator checks Instagram with 45.000 seguidores and a link, and YouTube with 8.000 seguidores and a link
- **THEN** both channels are saved as separate entries, each with its own follower count and link

#### Scenario: "Outra" is not offered
- **WHEN** the creator views the "Audiência e canais" table
- **THEN** only the fixed supported networks (Instagram, Facebook, YouTube, X, Threads, Telegram, LinkedIn) are listed as options, with no free-text custom network row

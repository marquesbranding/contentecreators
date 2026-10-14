## ADDED Requirements

### Requirement: Creators and companies can self-declare the Influencer Journey

Registration, corrections and self-editing of both creator and company profiles SHALL present the checkbox "Eu fiz a Jornada do Influenciador" with the Journey logo, followed by the note "* A Jornada do Influenciador é uma iniciativa que capacita, profissionaliza e potencializa o perfil de influência de seus participantes. Para saber mais acesse: www.jornadadoinfluenciador.com.br", where the address is a link opening in a new tab.

#### Scenario: Creator checks the box at registration

- **WHEN** a creator checks "Eu fiz a Jornada do Influenciador" and submits
- **THEN** `is_influencer_journey_participant` is saved as true for that creator profile

#### Scenario: Company unchecks while editing

- **WHEN** a company that had the flag unchecks the box and saves
- **THEN** the flag is saved as false

#### Scenario: Draft autosave keeps the choice

- **WHEN** a user checks the box during registration and resumes the draft later
- **THEN** the box is still checked

### Requirement: Journey badge appears next to the CDL badge

When the flag is true, the system SHALL show the Journey badge (logo on a light pill, alt text "Jornada do Influenciador") immediately after the CDL badge position on catalog cards, creator and company detail pages, and the "Meu perfil" header preview; detail pages SHALL also show the explanatory note with the link.

#### Scenario: Catalog card

- **WHEN** a Journey participant appears in the catalog
- **THEN** the card shows the Journey badge next to the type and CDL badges

#### Scenario: Detail page

- **WHEN** a viewer opens the detail page of a Journey participant
- **THEN** the Journey badge appears next to the name and the explanatory note with the link is visible

#### Scenario: Not a participant

- **WHEN** the flag is false
- **THEN** no Journey badge and no note are shown

### Requirement: Moderators see and can request changes to the Journey flag

The backoffice account detail and submission review SHALL show the Journey self-declaration as "Sim"/"Não", and "Solicitar alterações" SHALL list it as a correctable field.

#### Scenario: Review screen

- **WHEN** a moderator opens a submission whose profile has the flag true
- **THEN** the field "Jornada do Influenciador" reads "Sim"

#### Scenario: Request change

- **WHEN** a moderator requests changes selecting "Jornada do Influenciador"
- **THEN** the user's correction flow highlights that checkbox

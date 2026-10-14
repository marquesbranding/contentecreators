## MODIFIED Requirements

### Requirement: Creator profile section collects self-reported engagement metrics

When the creator checks Instagram in "Audiência e canais", the Instagram row SHALL expose four additional self-reported fields: Visualizações, Interações, Novos seguidores, and Conteúdo que você compartilhou. All four SHALL be non-negative whole numbers ("Conteúdo que você compartilhou" counts published pieces, placeholder "Ex.: 22"). These fields are only associated with the Instagram channel and are never applied to any other declared network. The values SHALL be submitted with the form, persisted in registration, corrections, self-editing and draft autosave, and reloaded into the form afterwards.

#### Scenario: Creator fills in Instagram-only metrics

- **WHEN** the creator checks Instagram and enters values for Visualizações, Interações, Novos seguidores, and Conteúdo que você compartilhou
- **THEN** the values are saved as self-reported metrics associated only with the creator's Instagram channel

#### Scenario: Saved metrics reload in the editor

- **WHEN** the creator saves the profile with Instagram metrics and reopens "Meu perfil"
- **THEN** the four fields show the saved values

#### Scenario: Shared content accepts only numbers

- **WHEN** the creator types "Reels" in Conteúdo que você compartilhou
- **THEN** the field does not accept it, and a value like 22 is saved as the integer 22

#### Scenario: Other networks do not receive Instagram's metrics

- **WHEN** the creator checks Instagram (with Visualizações/Interações/etc. filled in) and also checks YouTube
- **THEN** the YouTube channel's saved metrics do not include any Visualizações, Interações, Novos seguidores, or Conteúdo que você compartilhou values

#### Scenario: Instagram not checked

- **WHEN** the creator does not check Instagram
- **THEN** the Visualizações/Interações/Novos seguidores/Conteúdo que você compartilhou fields are not shown and no such values are saved for any channel

## ADDED Requirements

### Requirement: Public profile shows every declared Instagram metric

The creator detail page "Painel do Instagram" SHALL display every Instagram metric the creator declared: Seguidores, Visualizações, Interações, Novos seguidores and Conteúdo compartilhado; metrics left empty are omitted.

#### Scenario: All metrics declared

- **WHEN** a viewer opens the profile of a creator who declared all five Instagram metrics
- **THEN** the panel shows all five values

#### Scenario: Legacy text only

- **WHEN** the creator's latest Instagram snapshot has only the legacy shared-content text and no count
- **THEN** the panel keeps showing that text line and omits the numeric shared-content tile

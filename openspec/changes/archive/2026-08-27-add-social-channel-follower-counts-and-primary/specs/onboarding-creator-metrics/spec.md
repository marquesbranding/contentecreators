## MODIFIED Requirements

### Requirement: Creator profile section collects self-reported engagement metrics
When the creator checks Instagram in "Audiência e canais", the Instagram row SHALL expose four additional self-reported fields: Visualizações, Interações, Novos seguidores, and Conteúdo que você compartilhou. These fields are only associated with the Instagram channel and are never applied to any other declared network.

#### Scenario: Creator fills in Instagram-only metrics
- **WHEN** the creator checks Instagram and enters values for Visualizações, Interações, Novos seguidores, and Conteúdo que você compartilhou
- **THEN** the values are saved as self-reported metrics associated only with the creator's Instagram channel

#### Scenario: Other networks do not receive Instagram's metrics
- **WHEN** the creator checks Instagram (with Visualizações/Interações/etc. filled in) and also checks YouTube
- **THEN** the YouTube channel's saved metrics do not include any Visualizações, Interações, Novos seguidores, or Conteúdo que você compartilhou values

#### Scenario: Instagram not checked
- **WHEN** the creator does not check Instagram
- **THEN** the Visualizações/Interações/Novos seguidores/Conteúdo que você compartilhou fields are not shown and no such values are saved for any channel

### Requirement: Removed fields no longer appear
The onboarding form SHALL NOT present "Tipo de atuação", "Taxa de engajamento (%)", or "Nome de creator" as fields in the creator profile section.

#### Scenario: Creator fills out profile section
- **WHEN** the creator reaches the profile fields step
- **THEN** none of "Tipo de atuação", "Taxa de engajamento (%)", or "Nome de creator" are shown

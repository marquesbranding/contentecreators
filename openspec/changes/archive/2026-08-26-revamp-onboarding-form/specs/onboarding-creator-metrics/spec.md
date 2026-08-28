## ADDED Requirements

### Requirement: Creator profile section collects self-reported engagement metrics
The creator profile section of the onboarding form SHALL collect four self-reported fields: Visualizações, Interações, Novos seguidores, and a description of the content the creator shared, in place of the removed "Tipo de atuação", "Taxa de engajamento", and "Nome de creator" fields.

#### Scenario: Creator fills in metrics
- **WHEN** the creator enters values for Visualizações, Interações, Novos seguidores, and Conteúdo que você compartilhou
- **THEN** the values are saved as self-reported metrics associated with the creator's profile

### Requirement: Removed fields no longer appear
The onboarding form SHALL NOT present "Tipo de atuação", "Taxa de engajamento (%)", or "Nome de creator" as fields in the creator profile section.

#### Scenario: Creator fills out profile section
- **WHEN** the creator reaches the profile fields step
- **THEN** none of "Tipo de atuação", "Taxa de engajamento (%)", or "Nome de creator" are shown

# onboarding-niche-selection Specification

## Purpose
TBD - created by archiving change revamp-onboarding-form. Update Purpose after archive.
## Requirements
### Requirement: Expanded niche list
The "Principais nichos" section SHALL offer the client-approved list of specific niches (Lifestyle e rotina, Moda e estilo, Beleza/maquiagem e cuidados pessoais, Saúde/nutrição e bem-estar, Fitness/esportes e atividade física, Maternidade/paternidade e família, Infantil e conteúdo para crianças, Gastronomia e culinária, Viagens e turismo, Casa/decoração e organização, Finanças/investimentos e empreendedorismo, Tecnologia/games e inovação, Educação/carreira e desenvolvimento pessoal, Humor e entretenimento, Música/arte e cultura, Pets e animais, Sustentabilidade e consumo consciente, Relacionamentos e sexualidade, Conteúdo adulto, Comunidades e causas sociais, Marketing/publicidade e redes sociais), replacing the previous 6-option list.

#### Scenario: Creator selects niches
- **WHEN** the creator selects between 1 and 5 niches from the expanded list
- **THEN** the selected niches are saved with the creator's profile

### Requirement: Free-text niche suggestion
The niche list SHALL include an "envie sua sugestão" option that lets the creator submit a free-text niche not covered by the list.

#### Scenario: Creator suggests a niche
- **WHEN** the creator selects the suggestion option and enters free text
- **THEN** the suggested text is saved alongside the creator's other selected niches

### Requirement: Niche options are sourced from a single source of truth
The onboarding form's niche options SHALL be sourced from the same `niches` reference data used elsewhere in the product (e.g. catalog filtering), rather than a separately maintained list.

#### Scenario: Niche list is updated in the database
- **WHEN** an entry is added to or removed from the `niches` reference table
- **THEN** the onboarding form's niche checklist reflects the change without a separate code change to a hardcoded list


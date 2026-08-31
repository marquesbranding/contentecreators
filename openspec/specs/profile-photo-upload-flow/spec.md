# profile-photo-upload-flow Specification

## Purpose

TBD - created by archiving change simplify-profile-edit. Update Purpose after archive.

## Requirements

### Requirement: Single "Mudar foto" control per image slot

Each image slot (profile photo, cover photo) on the profile edit page SHALL be controlled by a single "Mudar foto" button rather than a full upload card.

#### Scenario: User views the profile edit page

- **WHEN** the profile edit page renders
- **THEN** each image slot shows the current photo (or a placeholder) next to a single "Mudar foto" button, with no separate file-picker row or "Enviar imagem" button visible by default

### Requirement: "Mudar foto" opens an action menu

Clicking "Mudar foto" SHALL open a menu with exactly three actions: "Carregar foto", "Remover foto atual", and "Cancelar".

#### Scenario: User clicks "Mudar foto"

- **WHEN** the user clicks "Mudar foto" for an image slot
- **THEN** a menu appears with "Carregar foto", "Remover foto atual", and "Cancelar" options

#### Scenario: User selects "Carregar foto"

- **WHEN** the user selects "Carregar foto"
- **THEN** the existing file picker and crop flow opens for that image slot

#### Scenario: User selects "Remover foto atual"

- **WHEN** the user selects "Remover foto atual"
- **THEN** the current image for that slot is removed, using the existing remove/reset logic

#### Scenario: User selects "Cancelar"

- **WHEN** the user selects "Cancelar"
- **THEN** the menu closes with no changes to the image slot

### Requirement: Back navigation label reads "Voltar"

Back navigation controls SHALL be labelled with the single word "Voltar", with no
trailing destination ("ao catálogo", "ao perfil"). The destination is already
evident from the page the user is leaving, and the shorter label keeps the control
readable on narrow viewports.

#### Scenario: User views the profile edit page footer controls

- **WHEN** the profile edit page renders
- **THEN** the back button label reads "Voltar"

#### Scenario: A caller supplies its own back label

- **WHEN** a host page passes an explicit `backLabel` (for example the backoffice's
  "Cancelar e voltar")
- **THEN** that label is used instead of the default

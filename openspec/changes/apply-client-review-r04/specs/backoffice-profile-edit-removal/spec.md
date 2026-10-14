## ADDED Requirements

### Requirement: Backoffice cannot edit user-declared profile data

The backoffice SHALL NOT offer any way to edit a creator's or company's declared profile data; the "Editar perfil" button, the `/backoffice/accounts/[accountId]/edit` route and the administrative profile-edit server actions SHALL NOT exist.

#### Scenario: Account detail without edit button

- **WHEN** an admin opens an account detail page
- **THEN** no "Editar perfil" button is shown, and a hint points to "Solicitar alterações" in moderation

#### Scenario: Old edit URL

- **WHEN** an admin navigates to `/backoffice/accounts/<id>/edit`
- **THEN** the page responds as not found

### Requirement: Corrections go through moderation

Data corrections SHALL be requested through the moderation "Solicitar alterações" action, and only the account owner SHALL change the data.

#### Scenario: Moderator needs a fix

- **WHEN** a moderator finds wrong data in an approved profile
- **THEN** the available path is "Solicitar alterações" with the fields to fix, and the user edits them in their own profile

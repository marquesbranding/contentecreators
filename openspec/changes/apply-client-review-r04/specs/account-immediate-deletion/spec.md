## ADDED Requirements

### Requirement: Account deletion is immediate and permanent

When an approved creator or company confirms "Excluir minha conta" (recent reauthentication plus the phrase "EXCLUIR"), the system SHALL, in the same request, permanently remove everything that belongs to that account according to the approved disposition matrix: profile, catalog presence, social channels, metrics, niches, locations, drafts, WhatsApp contact records and media (database and Storage). Records under legal retention SHALL be anonymized as in the matrix. There SHALL be no recovery window and no administrative recovery.

#### Scenario: Creator deletes the account

- **WHEN** an approved creator confirms the deletion
- **THEN** the creator disappears from the catalog, landing showcase, counters and detail pages immediately, and their profile, channels, metrics, media and drafts no longer exist in the database

#### Scenario: Nothing to recover

- **WHEN** an administrator opens the backoffice after a user deleted their account
- **THEN** there is no "Recuperar conta" action, and the account shows only as "Excluída" without personal data

#### Scenario: Legal retention preserved

- **WHEN** an account is deleted
- **THEN** consent records keep only document version, hash and date; audit snapshots and moderation reasons are redacted; the account row remains as a tombstone without name, e-mail or login link

### Requirement: The login is kept and is not blocked

Deleting the account SHALL NOT delete nor ban the Supabase Auth user; it SHALL end the user's sessions and unlink the login from the deleted account.

#### Scenario: Sessions end

- **WHEN** the deletion completes
- **THEN** the user is signed out everywhere and redirected to the account-deleted page

#### Scenario: Google login still works

- **WHEN** the same person later signs in with the same Google account or e-mail
- **THEN** sign-in succeeds and no deleted data is shown

### Requirement: The same person can register again from scratch

After deletion, signing in with the same login SHALL lead to the start of the registration flow (role selection), and the system MUST NOT reject the new registration because of the deleted account, for the same or a different role.

#### Scenario: Re-register with the same role

- **WHEN** a former creator signs in again and chooses "Sou Influenciador"
- **THEN** a new account is created and the full registration flow starts empty, ending in moderation like any new user

#### Scenario: Re-register with another role

- **WHEN** a former company signs in again and chooses a creator role
- **THEN** a new creator account is created normally

#### Scenario: Banned identity still blocked

- **WHEN** an account is banned
- **THEN** it cannot self-delete, and its blocked identity keeps preventing re-entry

### Requirement: Sponsorships never block the deletion

If the account is the featured creator or the advertiser of sponsorship placements, the deletion SHALL archive those placements and detach the featured creator reference instead of failing.

#### Scenario: Featured creator deletes the account

- **WHEN** a creator who is in an active "Criador em destaque" placement deletes the account
- **THEN** the placement is archived without a creator reference, stops rendering, and the deletion completes

### Requirement: Confirmation e-mail reflects the permanent deletion

The confirmation e-mail SHALL be delivered after the deletion, stating that the data was removed, that it cannot be recovered and that the person may register again at any time; its recipient and payload SHALL be anonymized right after delivery or definitive failure.

#### Scenario: E-mail delivered then scrubbed

- **WHEN** the outbox sends the deletion confirmation
- **THEN** the person receives it, and the outbox row's recipient and payload are anonymized afterwards

#### Scenario: No mention of recovery

- **WHEN** the person reads the deletion section, the confirmation dialog, the account-deleted page or the e-mail
- **THEN** none of them mention a 30-day window or account recovery

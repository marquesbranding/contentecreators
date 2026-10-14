## ADDED Requirements

### Requirement: Sponsorship stores explicit title and text visibility flags

`sponsorship_placements` SHALL have boolean columns `show_title` and `show_body`, `NOT NULL DEFAULT false`. The database MUST reject `show_title = true` when `title IS NULL` and `show_body = true` when `body IS NULL`. `title` and `body` SHALL remain optional.

#### Scenario: Flag without content rejected
- **WHEN** a placement is saved with `show_title = true` and no title
- **THEN** the database constraint and the API validation both reject it with a clear message

#### Scenario: Backfill preserves current behaviour
- **WHEN** the migration runs on placements that already have a title and/or body
- **THEN** `show_title` / `show_body` are `true` for those placements and `false` for the empty ones, without changing `version` or `updated_at`

#### Scenario: Saved but hidden
- **WHEN** an admin saves a placement with title "Campanha Black Friday" and "Exibir título na arte" unchecked
- **THEN** the title is stored and shown in the backoffice list, and is not rendered in the public sponsorship

### Requirement: Public delivery honors the flags

Public sponsorship payloads SHALL contain `title = null` when `show_title` is false and `body = null` when `show_body` is false, for admin-authored creatives on every slot (top banner, hero, carousel, inline, mid-list). The same rule applies to every placement type, including FEATURED_CREATOR: the flags are the only way title or text reach the creative.

#### Scenario: Title hidden
- **WHEN** a placement has title "X" and `show_title = false`
- **THEN** the landing/catalog response and the rendered HTML do not contain "X"

#### Scenario: Both shown
- **WHEN** both flags are true
- **THEN** title and text render exactly as before this change

### Requirement: Backoffice form exposes the toggles

The sponsorship content step SHALL show a checkbox "Exibir título na arte" next to the title field and "Exibir texto na arte" next to the text field. Each checkbox SHALL be disabled while its field is empty (after trim), SHALL be automatically unchecked when the field is cleared, and SHALL default to unchecked for new placements. The live preview SHALL render title/text only when the respective checkbox is checked. The management list SHALL keep showing the stored title and text regardless of the flags and SHOULD indicate when one is hidden.

#### Scenario: Checkbox disabled when empty
- **WHEN** the title input is empty
- **THEN** "Exibir título na arte" is disabled and unchecked

#### Scenario: Clearing the field resets the flag
- **WHEN** the title was shown and the admin clears the title input
- **THEN** the checkbox becomes unchecked and disabled

#### Scenario: Preview follows the checkbox
- **WHEN** the title is filled but the checkbox is unchecked
- **THEN** the preview shows the art without the title; checking it makes the title appear

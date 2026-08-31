# admin-linked-application-profile Specification

## Purpose

Lets an ADMIN identity also own a linked INFLUENCER or COMPANY account under
the same Supabase login, so administrators can test the backoffice and the
regular app with a single set of credentials, with a UI switcher between the
two surfaces.

## Requirements

### Requirement: An identity may own one ADMIN row and one linked non-admin row

The system SHALL allow a single `auth_user_id` to own at most one `accounts`
row per role — meaning an ADMIN row and one INFLUENCER-or-COMPANY row may
coexist for the same login, but not two rows of the same role.

#### Scenario: Admin creates a linked creator profile

- **WHEN** an already-approved ADMIN account with no linked profile submits
  the role-selection form for INFLUENCER or COMPANY
- **THEN** a new `accounts` row is created with that role, linked to the same
  `auth_user_id`, independent of the existing ADMIN row

#### Scenario: Linked role stays immutable

- **WHEN** an admin who already has a linked INFLUENCER row submits the
  role-selection form again for COMPANY
- **THEN** the request is rejected as an immutable-role conflict, the same as
  it would be for a non-admin account

### Requirement: Each surface resolves the role it owns

The backoffice surface (`/backoffice/*`) SHALL always resolve the identity's
ADMIN row. The app surface (`/app/*`, `/onboarding/*`) SHALL always resolve
the identity's non-admin (INFLUENCER or COMPANY) row, independent of whether
an ADMIN row also exists for the same identity.

#### Scenario: Dual-role admin browses the app

- **WHEN** an admin with a linked, approved COMPANY profile visits
  `/app/catalog`
- **THEN** the page renders using the COMPANY account's identity, not the
  ADMIN account's

#### Scenario: Admin with no linked profile visits the app

- **WHEN** an admin with no linked profile visits an `/app/*` page
- **THEN** they are routed to `/onboarding/role` to create one, the same as
  any authenticated identity with no account yet

### Requirement: A dual-role identity can switch surfaces from the UI

The backoffice shell SHALL show a link to the app surface (to the linked
profile if one exists, otherwise to role selection). The authenticated app
shell SHALL show a link back to the backoffice when the signed-in identity
also owns an ADMIN row.

#### Scenario: Switching from backoffice to app

- **WHEN** a dual-role admin is in the backoffice and their linked profile is
  approved
- **THEN** the backoffice header shows an "Ir para o app" link to
  `/app/catalog`

#### Scenario: Switching from app to backoffice

- **WHEN** a dual-role admin is browsing `/app/*`
- **THEN** the app header shows an "Ir para o backoffice" link

### Requirement: An admin cannot approve their own linked profile

The moderation system SHALL reject any moderation decision where the acting
admin and the target account share the same `auth_user_id`, regardless of
which of the admin's linked accounts is the target.

#### Scenario: Self-approval is blocked

- **WHEN** an admin whose linked COMPANY account is PENDING_REVIEW attempts to
  approve that same account through the moderation action
- **THEN** the action is rejected and no status change occurs

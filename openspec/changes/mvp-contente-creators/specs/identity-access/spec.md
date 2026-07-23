## ADDED Requirements

### Requirement: Users authenticate through supported Supabase providers

The system SHALL use Supabase Auth and SHALL support email/password and Google authentication. It MUST NOT offer Instagram authentication in the Beta.

#### Scenario: User signs up with email and password

- **WHEN** a visitor submits a valid email and compliant password
- **THEN** Supabase Auth creates the identity and initiates email confirmation

#### Scenario: User signs in with Google

- **WHEN** a visitor chooses Google sign-in and completes the OAuth callback
- **THEN** the system establishes a Supabase session and continues the first-access flow

#### Scenario: Visitor looks for unsupported social auth

- **WHEN** the login or registration page is rendered
- **THEN** no Instagram authentication control is present

### Requirement: Email identities are verified before profile submission

The system SHALL require confirmation of an email/password identity before the user can submit a profile for moderation. A valid Google identity MAY satisfy the verified-email condition when the provider assertion supplies a verified email.

#### Scenario: Unconfirmed email user attempts submission

- **WHEN** an email/password user has not confirmed the email and attempts to submit onboarding
- **THEN** the system blocks submission and presents instructions to confirm or resend the email

### Requirement: Users can recover passwords securely

The system SHALL provide forgot-password and reset-password flows using single-use Supabase recovery links, validated server-side sessions, and non-enumerating responses.

#### Scenario: Existing user requests recovery

- **WHEN** a user submits an account email on the recovery page
- **THEN** the system returns a generic success response and Supabase sends a recovery message through Marques Branding SMTP

#### Scenario: Recovery token is invalid or expired

- **WHEN** a user opens an invalid or expired recovery link
- **THEN** the system refuses the password change and offers a safe way to request a new link

### Requirement: First access requires one application role

The system SHALL redirect a non-admin authenticated user without a role to first-access role selection. The user SHALL select exactly one role, `INFLUENCER` or `COMPANY`; `ADMIN` MUST NOT be selectable publicly.

#### Scenario: New user chooses influencer

- **WHEN** a new authenticated user confirms the influencer path
- **THEN** the account role becomes `INFLUENCER` and the creator onboarding form opens

#### Scenario: New user chooses company

- **WHEN** a new authenticated user confirms the company path
- **THEN** the account role becomes `COMPANY` and the company onboarding form opens

#### Scenario: Caller attempts to choose admin

- **WHEN** a non-admin request submits `ADMIN` as a self-selected role
- **THEN** the system rejects the request without changing the account

### Requirement: Self-selected roles are immutable

The system SHALL prevent normal users from changing their role after confirmation. Any administrator override MUST be explicitly authorized, validated for data migration implications, and audited.

#### Scenario: User tampers with role input

- **WHEN** an `INFLUENCER` or `COMPANY` submits a role change through a form or direct action call
- **THEN** the system returns an authorization/domain error and preserves the original role

### Requirement: Session refresh and optimistic route gating use Next.js Proxy

The system SHALL use Next.js 16 `proxy.ts` to refresh Supabase auth cookies and perform cheap unauthenticated redirects. Proxy MUST NOT be the only authorization control and MUST NOT fetch catalog/profile authorization data.

#### Scenario: Session requires refresh

- **WHEN** a request contains a refreshable Supabase session
- **THEN** Proxy refreshes the cookie and preserves required response headers/cookies

#### Scenario: Unauthenticated visitor requests a protected route

- **WHEN** no valid authentication cookie is present
- **THEN** Proxy redirects the visitor to login with a safe return path

### Requirement: Authoritative authorization occurs in server-only boundaries

The system MUST validate the Supabase identity and application role/status inside the DAL for every protected read and inside every Server Action/Route Handler for every protected mutation. Client-side hiding and page-level redirects MUST NOT substitute for these checks.

#### Scenario: Direct action invocation bypasses the page

- **WHEN** an unauthorized caller invokes a protected Server Action directly
- **THEN** the action rejects the call before reading or mutating protected data

#### Scenario: Approved company requests catalog data

- **WHEN** the DAL verifies an `APPROVED` `COMPANY`
- **THEN** only the company-authorized catalog DTO is returned

### Requirement: Administrative access uses the shared Auth project and a separate backoffice entry

The system SHALL provide `/backoffice/login` and `/backoffice` experiences using the same Supabase Auth project. Only accounts with application role `ADMIN` SHALL enter the backoffice.

#### Scenario: Administrator signs in through backoffice

- **WHEN** a valid `ADMIN` authenticates through `/backoffice/login`
- **THEN** the administrator is redirected to the backoffice dashboard

#### Scenario: Normal user authenticates through backoffice login

- **WHEN** an `INFLUENCER` or `COMPANY` authenticates through the backoffice entry
- **THEN** the system denies backoffice access without revealing administrative data

### Requirement: Administrators are provisioned outside public registration

The system SHALL provision the initial administrator through a server-only bootstrap operation and SHALL allow additional administrators to be provisioned/invited only by an authorized administrator. Every admin grant/revocation MUST be audited.

#### Scenario: Initial admin is bootstrapped

- **WHEN** an operator runs the idempotent bootstrap with an approved email in a target environment
- **THEN** exactly one matching account receives `ADMIN` and the event is audited

#### Scenario: Existing admin provisions another admin

- **WHEN** an authorized administrator provisions an approved identity
- **THEN** the new admin can access the backoffice and the role grant appears in audit history

### Requirement: Known banned identities cannot recreate accounts

The system SHALL block sign-up, login continuation, onboarding edits, and resubmission for a known `BANNED` email/provider identity. The system SHALL retain a restricted blocked-identity record and revoke or administratively ban the known Supabase identity.

#### Scenario: Banned identity attempts normal login

- **WHEN** a known banned identity authenticates or presents an existing session
- **THEN** the system terminates product access and displays a non-actionable blocked-account message

#### Scenario: Banned email attempts recreation

- **WHEN** the same normalized email/provider identity attempts to create another account
- **THEN** the account creation hook or post-auth defense rejects continuation

### Requirement: Users can terminate their sessions

The system SHALL provide logout, clear local Supabase auth cookies, and redirect to a public route. Security-sensitive administrative actions MAY revoke active user sessions.

#### Scenario: User logs out

- **WHEN** an authenticated user activates “Sair”
- **THEN** the session is terminated and protected routes require authentication again

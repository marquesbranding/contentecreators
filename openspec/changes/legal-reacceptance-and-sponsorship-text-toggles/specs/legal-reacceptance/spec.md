## ADDED Requirements

### Requirement: Pending legal documents are derived from the latest active version

For an authenticated account with role `INFLUENCER` or `COMPANY` and status `PENDING_REVIEW`, `CHANGES_REQUESTED` or `APPROVED`, the system SHALL compute the pending documents as: for each of `TERMS` and `PRIVACY`, the active document (`retired_at IS NULL`, `active_from <= now()`, newest by `active_from` then `published_at`) for which no `account_consents` row exists for that account. Accounts with role `ADMIN`, status `ONBOARDING`, `SUSPENDED` or `BANNED`, and unauthenticated sessions SHALL have no pending documents.

#### Scenario: Existing user has only placeholder consents
- **WHEN** an approved creator whose only consents point to retired placeholder documents opens `/app`
- **THEN** both `TERMS 1.0` and `PRIVACY 1.0` are reported as pending

#### Scenario: User already accepted the latest version
- **WHEN** an account already has consent rows for the active `TERMS` and `PRIVACY`
- **THEN** no document is pending and no modal is shown

#### Scenario: New version published
- **WHEN** a new `TERMS 1.1` becomes active
- **THEN** every eligible account, including those that accepted `1.0`, has only `TERMS 1.1` pending

#### Scenario: Account still onboarding
- **WHEN** an account with status `ONBOARDING` opens the app
- **THEN** no modal is shown, because consent is registered when the onboarding is submitted

### Requirement: Pending acceptance is shown in a blocking central modal

Whenever the pending list is non-empty on a page under `/app` or `/onboarding`, the system SHALL show a centered modal that cannot be dismissed with Esc, overlay click or a close button. The modal SHALL list each pending document with title, version and publication date, a link that opens the PDF in a new tab, a button to download the PDF, one checkbox labelled "Li e aceito …", and a primary button "Aceitar e continuar" that is disabled until the checkbox is checked. A secondary "Sair" action SHALL sign the user out.

#### Scenario: Login shows the modal
- **WHEN** a pending user signs in and lands on `/app`
- **THEN** the modal appears over the page before any interaction

#### Scenario: Open and download the PDF
- **WHEN** the user clicks "Abrir" on a document
- **THEN** the PDF opens in a new tab at its `/legal/*.pdf` URL and the modal stays open
- **WHEN** the user clicks "Baixar PDF"
- **THEN** the browser downloads the file with the configured download name

#### Scenario: Accept button gated by checkbox
- **WHEN** the checkbox is unchecked
- **THEN** "Aceitar e continuar" is disabled

#### Scenario: Cannot be dismissed
- **WHEN** the user presses Esc or clicks outside the modal
- **THEN** the modal remains open

### Requirement: Accepting records one consent per pending document

When the user confirms, the system SHALL insert one `account_consents` row per pending document in a single transaction with `context = {"flow":"reacceptance","legalCopyApproved":true}`, the request id, and audit context. The operation MUST succeed for accounts whose status is `PENDING_REVIEW`, `CHANGES_REQUESTED` or `APPROVED`. The server MUST reject the request, writing nothing, if the submitted document ids differ from the currently pending set.

#### Scenario: Successful acceptance
- **WHEN** the user checks the box and clicks "Aceitar e continuar"
- **THEN** consent rows exist for each pending document, the modal closes without a full page reload, and reloading the page does not show it again

#### Scenario: Double submit
- **WHEN** the accept action runs twice for the same documents
- **THEN** the second call succeeds without creating duplicate rows and without an error shown to the user

#### Scenario: Stale modal
- **WHEN** a newer version was published after the modal loaded and the user submits the old ids
- **THEN** the server rejects the request, the UI shows "Os documentos foram atualizados. Recarregamos a página.", refreshes, and the modal now lists the newer version

#### Scenario: Failure is recoverable
- **WHEN** saving fails
- **THEN** the modal stays open, shows an error message, keeps the checkbox state and allows retry

### Requirement: Onboarding submission tolerates existing consent

Submitting the onboarding SHALL NOT fail when the account already has a consent row for the active `TERMS` or `PRIVACY`; duplicates MUST be ignored.

#### Scenario: Re-accepted before submitting
- **WHEN** an account in `CHANGES_REQUESTED` re-accepted the documents and then resubmits its profile
- **THEN** the resubmission succeeds and no duplicate consent row is created

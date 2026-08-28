# onboarding-account-type-selection Specification

## Purpose
TBD - created by archiving change revamp-onboarding-form. Update Purpose after archive.
## Requirements
### Requirement: Single account type choice with three options
The onboarding form SHALL present exactly one first-step choice for account type, with three mutually exclusive options: Influencer, UGC, and Empresa.

#### Scenario: User selects Influencer
- **WHEN** the user selects "Influencer" in the account type step
- **THEN** the form sets `account_role=INFLUENCER` and `creator_type=INFLUENCER`, and no separate "Tipo de atuação" field is shown later in the form

#### Scenario: User selects UGC
- **WHEN** the user selects "UGC" in the account type step
- **THEN** the form sets `account_role=INFLUENCER` and `creator_type=UGC`, and no separate "Tipo de atuação" field is shown later in the form

#### Scenario: User selects Empresa
- **WHEN** the user selects "Empresa" in the account type step
- **THEN** the form sets `account_role=COMPANY` and shows the company profile fields instead of the creator profile fields

### Requirement: Account type cannot change after submission
The chosen account type SHALL NOT be editable by the user after the cadastro is submitted, matching the existing rule that this choice defines which data is collected and cannot be changed post-submission.

#### Scenario: User views their profile after approval
- **WHEN** an approved creator or company views their profile edit page
- **THEN** the account type selector is not shown as an editable field


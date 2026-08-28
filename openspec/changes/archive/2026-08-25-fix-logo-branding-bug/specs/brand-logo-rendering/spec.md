## ADDED Requirements

### Requirement: Logo renders without an opaque background box
The `BrandLogo` component SHALL be rendered by consuming pages without a wrapper that paints an opaque background behind it, so the logo's own transparent background is preserved.

#### Scenario: Logo shown on the signup page header
- **WHEN** the onboarding/signup form header renders `BrandLogo`
- **THEN** no dark or black box appears behind the logo artwork

#### Scenario: Logo shown on the login page mobile header
- **WHEN** the login page's mobile header renders `BrandLogo`
- **THEN** no dark or black box appears behind the logo artwork

### Requirement: Logo renders at its correct aspect ratio
The `BrandLogo` component SHALL be sized by consuming pages in a way that preserves its native `2857:1039` aspect ratio, so the artwork is not cropped.

#### Scenario: Logo shown in the login page's branded side panel
- **WHEN** the login page's branded side panel renders `BrandLogo`
- **THEN** the full logo artwork is visible with no cropped edges

# Profile completion

## Purpose

Profile completion is guidance for profile owners and an operational metric for
administrators. It is not moderation evidence, does not approve an account, and
must not change the account lifecycle by itself.

The calculator validates field meaning rather than checking only whether a
database column is non-null. Invalidated, archived, malformed, or incomplete
values do not earn weight.

## Version 1

The persisted `accounts.completion_version` value is `1`. Every role totals
exactly 100 points. Influencer and UGC creators share the creator rule because
`UGC` is an exclusive `creator_type` of the `INFLUENCER` account role.

### Creator (`INFLUENCER` or `UGC`)

| Missing-field key | Requirement                                            | Weight | Classification      |
| ----------------- | ------------------------------------------------------ | -----: | ------------------- |
| `verifiedEmail`   | The registration identity completed email verification |      6 | Required for review |
| `legalName`       | Valid non-empty legal name                             |      7 | Required for review |
| `displayName`     | Valid non-empty creator display name                   |      7 | Required for review |
| `whatsapp`        | Valid Brazilian WhatsApp number                        |      7 | Required for review |
| `creatorType`     | Exactly one of `INFLUENCER` or `UGC`                   |      7 | Required for review |
| `location`        | Valid city and two-letter state                        |      7 | Required for review |
| `niches`          | At least one active niche                              |      7 | Required for review |
| `bio`             | Valid biography with at least 30 characters            |      7 | Required for review |
| `socialProfile`   | At least one supported HTTP(S) social profile          |      7 | Required for review |
| `metricSnapshot`  | At least one valid dated self-reported metric snapshot |      7 | Required for review |
| `avatar`          | Active owner-scoped avatar                             |     16 | Optional completion |
| `cover`           | Active owner-scoped cover image                        |     15 | Optional completion |

### Company

| Missing-field key    | Requirement                                            | Weight | Classification      |
| -------------------- | ------------------------------------------------------ | -----: | ------------------- |
| `verifiedEmail`      | The registration identity completed email verification |      5 | Required for review |
| `legalName`          | Valid non-empty legal name                             |      6 | Required for review |
| `tradeName`          | Valid non-empty trade name                             |      6 | Required for review |
| `cnpj`               | Locally checksum-valid CNPJ                            |      8 | Required for review |
| `employeeRange`      | Supported employee-count range                         |      6 | Required for review |
| `segment`            | Valid non-empty company segment                        |      6 | Required for review |
| `whatsapp`           | Valid Brazilian WhatsApp number                        |      6 | Required for review |
| `description`        | Valid description with at least 30 characters          |      8 | Required for review |
| `primaryLocation`    | One complete primary Brazilian location                |     10 | Required for review |
| `website`            | Safe HTTP(S) website                                   |      7 | Optional completion |
| `socialProfile`      | At least one supported HTTP(S) social profile          |      7 | Optional completion |
| `additionalLocation` | At least one complete non-primary location             |      5 | Optional completion |
| `logo`               | Active owner-scoped logo                               |     10 | Optional completion |
| `cover`              | Active owner-scoped cover image                        |     10 | Optional completion |

## Deliberate exclusions

- Terms and Privacy acceptance remain mandatory, versioned submission gates.
  They are not profile-quality points.
- Contact-visibility consent is optional and never changes completion.
- BrasilAPI lookup success is not weighted because it is form assistance, not
  verification.
- Approval, suspension, ban, archive, featured status, and sponsorship state do
  not enter the calculation.

## Versioning and persistence

Every stored percentage is paired with `completion_version`. A change to field
meaning or weight requires a new documented version, calculator tests, a
recalculation migration/job, and updated owner/admin presentations. Owner detail
and administrative aggregates must expose or filter by the same active version
so values from different definitions are never silently combined.

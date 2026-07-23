## Why

Contente Creators needs a low-cost, mobile-first Beta that validates demand by onboarding creators and companies, moderating them manually, and connecting approved participants through a searchable private catalog. The current repository is only a Next.js starter, so the product, operational backoffice, security model, auditability, and repeatable local-to-production delivery path must be established together.

## What Changes

- Replace the starter page with one Next.js application containing the Portuguese (`pt-BR`) marketing site, authenticated product, and administrative backoffice; keep source code, identifiers, tests, and technical documentation in English.
- Add Supabase Auth for email/password and Google sign-in, email verification, password recovery, server-side session refresh, optimistic route gating, and secure role/ownership checks close to the data source.
- Add first-access role selection for `INFLUENCER` or `COMPANY`; `ADMIN` is provisioned separately. Creator onboarding selects exactly one creator type: `INFLUENCER` or `UGC`.
- Add role-specific onboarding forms, server-side CNPJ lookup through BrasilAPI with loading/error/manual fallback states, profile completion/editing, profile cover/avatar/logo uploads through Supabase Storage, and completion indicators.
- Add the moderated lifecycle `ONBOARDING` → `PENDING_REVIEW` → `CHANGES_REQUESTED` → `APPROVED`, plus reversible `SUSPENDED` and terminal `BANNED`. Corrections can be resubmitted; a known banned identity cannot recreate or resubmit an account.
- Allow authenticated but unapproved users into the application shell while replacing every catalog listing with the fallback “Seu cadastro está sendo analisado”. Only approved accounts can see catalog data.
- Add a private creator catalog for approved companies and creators, with creator cards, profiles, name search, filters, external contact actions for companies, and the company-logo carousel available only inside the approved creator experience.
- Keep the public landing page free of creator listings, creator cards, names, photos, and company-logo listings until the client approves public social proof. Retain value proposition, audience paths, how-it-works content, CTA, footer, and configurable promotional placements.
- Add a role-protected `/backoffice` for multiple administrators: moderation queue, correction requests, approval, suspension, bans, profile management, soft removal/archival, sponsorship placement management, and basic operational metrics.
- Add SMTP delivery through Marques Branding for Supabase Auth messages and application transactional messages covering onboarding, correction requests, approval, suspension/ban notices, and password recovery.
- Add append-only, Envers-style change history for meaningful business data and moderation actions, capturing actor, source, timestamp, operation, reason, and before/after snapshots without exposing secrets.
- Add Supabase Postgres, Drizzle ORM, Supabase Storage with RLS, shadcn/ui, Tailwind CSS, typed validation, accessibility, LGPD consent/legal surfaces, observability, and abuse/rate-limit controls appropriate to the Beta.
- Organize the modular monolith with vertical feature slices and explicit public APIs; isolate reusable client orchestration in custom hooks, use Axios with TanStack Query for interactive remote state, and use one slice-composed Zustand store for truly global client UI state instead of proliferating business-context providers.
- Add a reproducible local Supabase stack and isolated remote projects named `contente-creators-dev` and `contente-creators-prd`, paired with two Vercel projects of the same names and migration-based promotion.
- Enforce TDD, mobile-first responsive behavior, automated unit/component/integration/E2E/accessibility checks, and deployment quality gates.
- Explicitly exclude payments, commissions, split/escrow, internal chat, proposals/campaigns, digital contracts, agency profiles, ratings/reputation, native apps, and automated antifraud/identity verification. CNPJ lookup is form assistance only; sponsorship commercial settlement remains off-platform.

## Capabilities

### New Capabilities

- `marketing-site`: Public `pt-BR` landing experience, audience-specific calls to action, promotional placements, metadata, and the initial prohibition on public profile/company listings.
- `identity-access`: Supabase authentication, first-access role selection, session refresh, route gating, role authorization, admin access, identity bans, and account recovery.
- `onboarding-profiles`: Role-specific data collection, exclusive creator type, CNPJ assistance, profile editing/completion, social metrics, locations, and Supabase media uploads.
- `moderation-lifecycle`: Manual approval queue, correction and resubmission workflow, approval, suspension, banning, visibility state machine, reasons, and user notifications.
- `private-catalog`: Approved-only creator discovery, filters, search, creator details, role-specific visibility, company carousel, contact actions, pagination, and empty/loading/error states.
- `sponsorship-placements`: Admin-managed top, side, carousel, and featured-creator placements with scheduling, ordering, activation, creative content, and no in-app billing.
- `backoffice-operations`: Multi-admin backoffice for account/profile operations, moderation views, sponsorship management, and basic metrics.
- `transactional-communications`: Marques Branding SMTP integration, Supabase Auth templates, application email templates, delivery tracking, retry/idempotency, and safe local email capture.
- `audit-compliance`: Append-only entity revisions, moderation history, actor attribution, sensitive-data redaction, LGPD consent/legal requirements, retention, and operational audit access.
- `platform-delivery`: Next.js architecture, Drizzle/Supabase data layer, Storage/RLS security, local/dev/production environments, Vercel delivery, mobile-first UI, TDD, accessibility, performance, and CI gates.

### Modified Capabilities

None. This repository has no existing OpenSpec product capabilities.

## Impact

- **Application:** `src/app`, route groups, Server Components/Actions, Route Handlers, Next.js 16 `proxy.ts`, server-only data access and authorization modules, shared UI, validation, email, audit, and test layers.
- **Data:** New Drizzle schema and migrations for identities, profiles, locations, social accounts/metrics, moderation, sponsorships, notifications, consent, and audit revisions; Supabase Auth remains the credential authority.
- **External systems:** Supabase Auth/Postgres/Storage, Google OAuth, BrasilAPI, Marques Branding SMTP, Vercel, DNS/email deliverability configuration, and GitHub-based CI/CD.
- **Dependencies:** shadcn/ui, Tailwind CSS, Drizzle ORM/Kit, Supabase SSR/client packages, PostgreSQL driver, Zod/form tooling, Axios, TanStack Query, Zustand, SMTP client/templates, and unit/component/E2E/accessibility tooling.
- **Operations:** Two isolated hosted environments plus local Supabase; secrets and migrations are environment-specific and production data is never used as development seed data.

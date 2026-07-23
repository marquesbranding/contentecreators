## ADDED Requirements

### Requirement: The implementation uses the mandated modern stack

The system SHALL use the existing Next.js App Router/React/TypeScript project with Tailwind CSS 4, shadcn/ui, Supabase Auth/Postgres/Storage, Drizzle ORM, Axios, TanStack Query, Zustand, and npm-managed locked dependencies. New framework usage MUST follow the repository’s installed Next.js 16 documentation and deprecations.

#### Scenario: Developer introduces route middleware

- **WHEN** route interception is implemented on Next.js 16
- **THEN** it uses the supported `proxy.ts` convention and documented behavior

### Requirement: Product behavior is organized in vertical feature slices

The system SHALL organize domain behavior into cohesive vertical slices that may own browser API adapters, UI components, custom hooks, pure domain rules, schemas, public types, optional Zustand store contributions, server actions/components/services/repositories/policies/mappers, and tests. A slice SHALL create only the folders needed by implemented behavior and SHALL expose separate browser-safe/shared and server-only public APIs. App Router files SHALL remain thin composition/transport boundaries; mixed barrels, cross-slice deep imports, reverse shared-to-feature dependencies, and client-to-server-module imports MUST be rejected by automated boundary checks.

#### Scenario: A new moderation behavior is added

- **WHEN** the behavior requires a page control, request, validation, server use case, and tests
- **THEN** those artifacts live in the moderation slice and other code consumes only its documented runtime-appropriate public API

#### Scenario: A small feature slice is introduced

- **WHEN** the first behavior needs only a component and pure rule
- **THEN** the slice contains only the required component/domain/test/public-API files and does not receive empty `api`, `hooks`, `stores`, or `server` directories

#### Scenario: A slice service mutates business data

- **WHEN** the service executes the use case
- **THEN** it authorizes, coordinates feature repositories/integrations, applies the transaction and audit requirements, and returns a typed result without importing React or HTTP response concerns

#### Scenario: Client code imports a feature

- **WHEN** a Client Component or hook is bundled
- **THEN** its dependency graph contains no feature `server.ts`, `server/`, database, secret, or shared server-only module

### Requirement: Custom hooks isolate reusable client orchestration

Client request, cache, upload, URL synchronization, and multi-step UI orchestration SHALL be exposed through focused feature custom hooks when reuse or branching warrants it. Hooks MUST NOT make authorization decisions authoritative, hide server domain transitions, or combine unrelated concerns.

#### Scenario: CNPJ autocomplete is rendered in the company form

- **WHEN** a valid complete CNPJ triggers lookup
- **THEN** the component consumes a tested company-onboarding hook that exposes typed loading/success/error/cancel states while the Route Handler remains the security boundary

### Requirement: Interactive remote state uses the shared Axios and TanStack Query layer

Client-driven remote reads and mutations SHALL use feature hooks backed by TanStack Query and one typed same-origin Axios client. Query keys, cancellation, bounded retries, invalidation/removal, normalized errors, and authorization-loss handling SHALL be explicit. Browser code MUST NOT use Axios to access Postgres, privileged Supabase APIs, BrasilAPI, or SMTP directly.

#### Scenario: A catalog request is superseded by new filters

- **WHEN** the URL filters change before the previous request completes
- **THEN** TanStack Query passes its cancellation signal through Axios, the obsolete request is cancelled or ignored, and only the current query key can render results

#### Scenario: Remote account eligibility changes

- **WHEN** a query receives an authorization/status denial or a moderation mutation succeeds
- **THEN** protected query data is removed or invalidated immediately and is never copied into Zustand

### Requirement: Client state has one explicit owner

The system SHALL keep server-rendered/security-sensitive data in Server Components and the DAL, interactive remote state in TanStack Query, shareable filters in URL search parameters, form state in the form layer, local UI state in React, and only truly cross-route ephemeral UI state in Zustand. Session, role, account status, API entities, form fields, secrets, and authorization decisions MUST NOT be stored as Zustand authority.

#### Scenario: Multiple distant UI surfaces coordinate a global drawer

- **WHEN** the drawer must be opened from more than one route surface
- **THEN** a narrow selector/action is added to the single slice-composed Zustand application store instead of adding a feature Context provider

#### Scenario: Zustand participates in an SSR route

- **WHEN** a client tree using the application store is server-rendered
- **THEN** the store is created through the application provider boundary, React Server Components do not access it, request state cannot leak across users, and persisted slices pass hydration tests

### Requirement: Technical artifacts use English and UI copy uses pt-BR

Source identifiers, database objects, routes, tests, comments, and technical documentation SHALL use English. User-visible copy, validation, emails, dates, and number formatting SHALL use correct Brazilian Portuguese unless displaying a proper external name.

#### Scenario: Validation error reaches the browser

- **WHEN** a profile field fails validation
- **THEN** the code/schema key remains English and the displayed message is correctly written in `pt-BR`

### Requirement: The UI uses an owned shadcn/Tailwind design system

The system SHALL define semantic design tokens and compose product components from project-owned shadcn/ui primitives and Tailwind utilities. It SHALL avoid one-off styling that breaks responsive, focus, disabled, error, or loading states.

#### Scenario: New form control is added

- **WHEN** an implementation slice introduces a control
- **THEN** it uses the shared semantic tokens/primitives and includes all interaction/accessibility states

### Requirement: All experiences are mobile-first and responsive

The system SHALL start layouts at 320 px, enhance at content-driven breakpoints, provide at least 44 px touch targets where applicable, and prevent horizontal page scrolling. Catalog and backoffice tables SHALL have usable mobile alternatives.

#### Scenario: Critical journey runs at 320 px

- **WHEN** registration, onboarding, pending fallback, catalog, profile, or moderation is exercised at 320 px width
- **THEN** content and actions remain readable, reachable, and operable without desktop-only interaction

### Requirement: The product meets accessibility acceptance gates

The system SHALL target WCAG 2.2 AA, semantic landmarks/headings, labels/descriptions, keyboard navigation, focus visibility/management, screen-reader announcements for async states, reduced motion, alt text, and contrast compliance.

#### Scenario: Automated accessibility suite runs

- **WHEN** representative public, auth, onboarding, catalog, profile, and backoffice pages are tested
- **THEN** no serious/critical axe violation is accepted without a documented approved exception

### Requirement: Development follows TDD

Each behavior slice SHALL begin with a failing automated test, proceed to the minimum implementation that passes, and be refactored while green. Domain state transitions, authorization boundaries, RLS/storage policies, validation, external adapters, and critical user journeys MUST have explicit tests rather than relying only on aggregate coverage.

#### Scenario: State transition is implemented

- **WHEN** a new allowed or forbidden moderation transition is added
- **THEN** failing unit/integration tests for success, rejection, audit, and idempotency exist before the implementation is considered complete

### Requirement: Automated tests cover layered behavior

The project SHALL maintain unit, component, local-Supabase integration, external-contract, Playwright E2E, responsive, and accessibility tests with deterministic synthetic fixtures. Critical journeys SHALL include Chromium and WebKit coverage where browser behavior matters.

#### Scenario: Pull request changes authorization

- **WHEN** CI evaluates the pull request
- **THEN** unit and local integration isolation tests plus relevant E2E denial/success paths run

### Requirement: CI enforces quality before deployment

CI SHALL gate merge/deployment on formatting, lint, TypeScript checking, unit/component tests, clean local migration reset, integration tests, production build, E2E smoke, accessibility checks, and dependency/security review. Failures MUST stop promotion.

#### Scenario: Migration fails on clean database

- **WHEN** CI runs the local database reset from committed migrations
- **THEN** the pipeline fails before any hosted deployment

### Requirement: Local Supabase is reproducible

The repository SHALL contain project-scoped Supabase CLI configuration, timestamped migrations, Storage/Auth configuration, and deterministic synthetic seeds so a developer can start/reset Auth, Postgres, Storage, Studio, and local email capture without hosted Vercel.

#### Scenario: New developer initializes locally

- **WHEN** supported Node/npm and Docker are available and documented setup commands run
- **THEN** the complete local stack starts, migrations/seeds apply, and the Next.js app can execute critical flows on localhost

### Requirement: Hosted development and production are isolated

The system SHALL use separate Vercel and Supabase projects named exactly `contente-creators-dev` and `contente-creators-prd`, with distinct URLs, databases, Auth users, Storage objects, OAuth callbacks, SMTP configuration, keys, secrets, and data.

#### Scenario: Development deployment reads configuration

- **WHEN** `contente-creators-dev` is deployed
- **THEN** it can access only development Supabase/SMTP/OAuth resources

#### Scenario: Production deployment reads configuration

- **WHEN** `contente-creators-prd` is deployed
- **THEN** it can access only production resources and never development data

### Requirement: Database delivery is migration-driven

Committed Supabase SQL migrations SHALL be the hosted schema source of truth and Drizzle schemas SHALL remain synchronized for typed runtime access. Shared/production schema MUST NOT be changed by `drizzle-kit push` or undocumented dashboard edits.

#### Scenario: Schema change is promoted

- **WHEN** a reviewed migration passes a clean local reset and development verification
- **THEN** the same immutable migration is applied to production through the controlled pipeline

### Requirement: Serverless database access uses supported pooling

Vercel runtime database traffic SHALL use Supavisor transaction pooling with `postgres-js` prepared statements disabled and bounded short transactions. Migration tooling SHALL use an appropriate direct/session connection.

#### Scenario: Runtime query starts

- **WHEN** a Vercel function creates/uses the Drizzle client
- **THEN** its connection configuration is compatible with Supavisor transaction mode and does not retain session state outside a transaction

### Requirement: RLS and Storage policies provide defense in depth

Every exposed business table and private Storage bucket SHALL have explicit default-deny/least-privilege policies tested for owner, approved-role, admin, anonymous, cross-account, suspended, and banned cases. Service-role keys MUST never be shipped to the browser.

#### Scenario: Cross-account storage read is attempted

- **WHEN** an authenticated user requests another owner’s private object without catalog media authorization
- **THEN** policy denies access

### Requirement: Secrets are validated and isolated

The system SHALL validate required environment variables at startup/build boundaries, separate public and server-only variables, and store secrets only in ignored local configuration, encrypted CI/Vercel settings, or Supabase configuration.

#### Scenario: Required production secret is absent

- **WHEN** a production build/deployment validation runs without it
- **THEN** deployment fails with a non-secret diagnostic

### Requirement: The system has performance and resilience budgets

The system SHALL use bounded pagination, indexed filters, optimized responsive media, server rendering/streaming where suitable, timeouts for external calls, and caching that respects authorization. Public and core mobile pages SHALL target Core Web Vitals “good” thresholds under representative conditions.

#### Scenario: Catalog contains more records than one page

- **WHEN** a mobile user opens catalog
- **THEN** only a bounded indexed result set and appropriately sized media are transferred

### Requirement: Observability is structured and privacy-safe

The system SHALL emit request-correlated structured logs/metrics for authentication failures, authorization denials, moderation transitions, banned-identity attempts, BrasilAPI health, outbox failures, migrations, and health checks without logging personal data or secrets.

#### Scenario: CNPJ provider times out

- **WHEN** the adapter reaches its timeout
- **THEN** telemetry records provider/result category/duration/request ID but not the CNPJ or raw response

### Requirement: Production readiness includes operational runbooks

Before production launch, the system SHALL document provisioning, migration, rollback/roll-forward, environment verification, backup/export and restore checks, free-tier capacity/upgrade triggers, SMTP deliverability, OAuth callback verification, incident response, and post-deploy smoke tests.

#### Scenario: Production release is approved

- **WHEN** the release checklist is evaluated
- **THEN** all client-owned account, legal, email/DNS, migration, smoke, and recovery gates are recorded as complete

## Context

The repository is a stock Next.js 16.2 App Router project with React 19, TypeScript, Tailwind CSS 4, npm, and no product or persistence layer. The Beta must be delivered as one browser application containing a public marketing site, an authenticated B2C catalog, and an administrative backoffice. The primary users are Brazilian creators, UGC creators, companies, and Contente Creators administrators; the client will own hosted accounts and credentials before production launch.

Requirement precedence is fixed: the confirmed user brief overrides `Contente Creators Beta - Roadmap.docx`; the DOCX fills gaps; implementation assumptions must not silently introduce new product behavior. Source code, identifiers, paths, tests, database objects, and technical documents use English. User-facing text uses grammatically correct Brazilian Portuguese and the root document declares `lang="pt-BR"`.

The cost constraint favors free tiers initially: local Supabase through the CLI and Docker, hosted Supabase for Auth/Postgres/Storage, and Vercel for Next.js. Hosted development and production are fully isolated as `contente-creators-dev` and `contente-creators-prd`. Free-tier limits and lack of production-grade guarantees are accepted Beta constraints, not hidden assumptions.

The product is deliberately a curated directory, not a transactional marketplace. It collects profiles, manually moderates them, and lets approved users discover creators and contact them through external channels. Payments, commercial settlement, chat, campaigns, proposals, contracts, agencies, reputation, native apps, and automated identity/fraud verification are excluded.

## Goals / Non-Goals

**Goals:**

- Deliver the complete Beta flow from acquisition through registration, onboarding, moderation, approval, catalog discovery, external contact, profile maintenance, sponsorship presentation, and backoffice operation.
- Preserve one codebase and one design system across public, authenticated, and administrative experiences while enforcing role and status boundaries on the server and in Postgres.
- Make the primary experience fast, accessible, and genuinely usable from narrow mobile browsers upward.
- Make all meaningful business changes traceable through immutable revision records similar in intent to Hibernate Envers.
- Keep local development reproducible and make promotion from local to hosted development to production migration-driven and test-gated.
- Use TDD for domain rules, authorization, data access, UI states, external integrations, and critical journeys.
- Minimize personal-data exposure and capture versioned consent required for LGPD-oriented operation.

**Non-Goals:**

- Public creator/company directories or public social-proof profile/logo listings. A later client decision can introduce them as a separate change.
- Any in-app payment, subscription, commission, split, escrow, sponsorship checkout, invoicing, or financial ledger.
- Internal chat, messaging, proposals, campaigns, content delivery, digital contracts, rights management, or negotiation workflows.
- Agency accounts, agency dashboards, ratings, reviews, reputation scores, or the DOCX's initial “five-star” placeholder.
- Instagram authentication. Only email/password and Google are supported.
- Automated antifraud or legal CNPJ verification. BrasilAPI improves form completion but never establishes legitimacy.
- Native iOS/Android applications or offline-first/PWA installation work.
- Automated bulk approval in the Beta. The data/query design must avoid preventing it later.

## Decisions

### 1. Use a vertical-slice modular monolith in the existing Next.js application

The Beta will remain a single Next.js App Router deployment. Route groups separate delivery surfaces, while business behavior is organized as vertical feature slices. A route composes feature public APIs but does not become a second home for domain rules:

```text
src/
  app/
    _providers/
      app-providers.tsx
      app-store.ts
    (marketing)/
      page.tsx
      privacy/page.tsx
      terms/page.tsx
    (auth)/
      login/page.tsx
      sign-up/page.tsx
      forgot-password/page.tsx
      reset-password/page.tsx
      auth/callback/route.ts
    (product)/
      onboarding/role/page.tsx
      onboarding/profile/page.tsx
      app/page.tsx
      app/catalog/page.tsx
      app/creators/[creatorId]/page.tsx
      app/profile/page.tsx
    backoffice/
      login/page.tsx
      page.tsx
      moderation/page.tsx
      accounts/page.tsx
      accounts/[accountId]/page.tsx
      sponsorships/page.tsx
      audit/page.tsx
    api/
      company-registry/cnpj/[cnpj]/route.ts
      catalog/creators/route.ts
      backoffice/moderation/route.ts
      health/route.ts
      internal/email-outbox/route.ts
  features/
    catalog/                         # expanded reference slice
      api/
        catalog.api.ts               # typed Axios calls; no React
        catalog.query-options.ts     # query keys/options/invalidation
      components/
        catalog-view.client.tsx
        creator-card.tsx
      hooks/
        use-catalog.ts
        use-catalog-filters.ts
      domain/
        catalog.rules.ts             # pure business rules
      schemas/
        catalog.schema.ts            # runtime boundary validation
      types/
        catalog.types.ts             # public DTO/view-model contracts
      stores/
        catalog-ui.store-slice.ts    # optional Zustand contribution
      server/
        actions/
        components/
        mappers/
        policies/
        repositories/
        services/
      tests/
      index.ts                       # browser-safe/shared public API
      server.ts                      # guarded server-only public API
    identity/
    onboarding/
    profiles/
    moderation/
    sponsorships/
    backoffice/
    notifications/
    audit/
    marketing/
  shared/
    api/
      axios-client.ts
      api-error.ts
      get-query-client.ts
    components/
      ui/                           # project-owned shadcn/ui primitives
      shared/
    hooks/
    server/
      auth/
      dal/
      email/
      storage/
      integrations/
      observability/
    copy/
      pt-BR.ts
    lib/
      env/
      validation/
      formatting/
      result/
    types/
      api.types.ts
      pagination.types.ts
  db/
    client.ts
    schema/
  test/
    builders/
    fixtures/
    helpers/
proxy.ts
```

`src/app` is the routing and composition layer. It owns Next.js route files, route groups, layouts, loading/error boundaries, metadata, thin Route Handlers, and the private `_providers` composition root. Business implementation stays outside `app`; a route imports the required feature public API and wires inputs/outputs. Route-specific UI that cannot be reused anywhere else may be colocated under a private `_components` folder, but it cannot contain domain behavior.

Each slice represents a cohesive business capability, not a page, database table, or technical layer. The initial slice boundaries are `identity`, `onboarding`, `profiles`, `moderation`, `catalog`, `sponsorships`, `backoffice`, `notifications`, `audit`, and `marketing`. A slice may contain the following folders, but MUST create only the folders it actually needs:

| Folder/file            | Responsibility                                                                                                            | Must not contain                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `api/`                 | Browser-safe Axios functions plus TanStack Query key/option factories                                                     | React components, direct database/provider calls, authorization decisions                      |
| `components/`          | Presentational feature UI safe to compose from the appropriate runtime; narrow `*.client.tsx` leaves opt into interaction | Drizzle queries, secrets, server-only imports, unrelated design-system primitives              |
| `hooks/`               | Focused client orchestration such as `use-catalog`, query/mutation hooks, upload control, and URL synchronization         | Authoritative permission/domain decisions, raw SQL, generic wrappers around trivial `useState` |
| `domain/`              | Pure deterministic rules/value transformations that run without React, HTTP, database, or browser APIs                    | Framework code, network access, mutable global state                                           |
| `schemas/`             | Zod schemas for external, form, action, and API boundaries; TypeScript input types are inferred from schemas              | Database access or duplicated handwritten validation types                                     |
| `types/`               | Public DTOs, view models, commands/results, and narrow feature contracts not already inferred                             | Drizzle row mirrors, catch-all interfaces, credentials, unrelated global types                 |
| `stores/`              | Optional Zustand store-slice contribution for genuinely cross-route ephemeral feature UI                                  | Remote entities/cache, Auth/session/role/status, form state, URL filters, secrets              |
| `server/actions/`      | Thin Server Action adapters for progressively enhanced commands                                                           | Duplicated use cases or client imports                                                         |
| `server/components/`   | Server-connected feature components that fetch/authorize through services and are exported only by `server.ts`            | Client hooks, browser APIs, or direct exposure through `index.ts`                              |
| `server/services/`     | Application use cases: authorize, coordinate repositories/integrations, open transactions, audit, and return results      | HTTP/React concerns, generic utility bags, unaudited mutations                                 |
| `server/repositories/` | Feature-owned Drizzle queries and persistence mapping                                                                     | Business workflow orchestration or transport-specific response objects                         |
| `server/policies/`     | Explicit authorization/eligibility/state-transition policies used by services and tests                                   | UI-only visibility flags treated as security                                                   |
| `server/mappers/`      | Database/provider records to minimal DTOs and safe audit inputs                                                           | Queries, side effects, or leaking raw records                                                  |
| `tests/`               | Slice unit, hook, component, contract, and integration tests grouped by behavior                                          | Shared production implementation                                                               |
| `index.ts`             | Small browser-safe/shared public API                                                                                      | Server-only exports or broad wildcard barrels                                                  |
| `server.ts`            | `server-only` guarded public API for RSCs, Route Handlers, and Server Actions                                             | Client hooks/components/store exports                                                          |

`services` therefore has one precise meaning: server-side application orchestration. Browser HTTP code belongs in `api`, reusable client behavior in `hooks`, pure business rules in `domain`, and persistence in `server/repositories`. Files use behavior-oriented English names (`approve-submission.service.ts`, `catalog.repository.ts`, `use-catalog-query.ts`) rather than ambiguous names such as `helpers.ts`, `common.ts`, or a single growing `service.ts`.

The minimum valid slice contains only the implementation, tests, and runtime-appropriate public API required by its first behavior. An expanded slice adds folders when behavior requires them; empty template folders and speculative abstractions are forbidden. A slice is split when it develops an independent business vocabulary/lifecycle, materially different authorization rules, or a public API too broad to explain concisely—not merely because it has many files.

#### Dependency direction

```text
app routes / app _providers
            |
            v
feature public APIs (index.ts or server.ts)
            |
            v
same-feature components/hooks/api/domain/server
            |
            +--------------------+
            v                    v
shared runtime primitives    db client/schema
```

- `app` is the composition root and may import multiple feature public APIs.
- A feature may import `shared`, `db` from its server graph, and another feature only through that feature's runtime-appropriate public API.
- `shared` and `db` never import a feature. They remain domain-neutral infrastructure.
- Client graphs may import `index.ts`, `api`, `hooks`, client components, schemas, types, domain rules, and store-slice types; they never import `server.ts`, `server/`, `db`, or `shared/server`.
- Server graphs may import feature `server.ts`, same-slice server internals, `db`, and `shared/server`; they never import client hooks or Zustand stores.
- Wildcard barrels across runtime boundaries are forbidden. ESLint/import-boundary rules and `server-only` guards enforce these directions.

The root Zustand store is composed in `src/app/_providers/app-store.ts` from the rare optional store-slice contributions exported by features. This is an allowed composition-root dependency and keeps `shared` from importing business features. A feature adds a contribution only when state truly crosses routes/surfaces; route-local state remains local and does not enlarge the root store. `app-providers.tsx` creates the per-request-safe Zustand store and QueryClient boundaries; it does not contain business behavior.

Server Components fetch and render server-owned initial data. Client Components use custom hooks for reusable UI orchestration rather than embedding request, cache, upload, or multi-step form coordination in presentation components. Hooks do not become an authorization layer or a home for authoritative domain transitions; those remain in server use cases, the DAL, and the database.

Thin Server Actions handle progressively enhanced form mutations. Same-origin Route Handlers support OAuth callbacks, interactive Axios/TanStack Query reads and mutations, CNPJ lookup, health checks, and signed operational endpoints. A use case has one mutation transport—Server Action or Route Handler—not duplicate implementations. Every action and handler revalidates authentication, authorization, resource ownership, current account status, and input because client hooks and UI-level checks are not security boundaries.

#### Client and server state ownership

| State/operation                                                                                 | Owner                                                         | Rule                                                                                        |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Security-sensitive initial reads, SEO content, account role/status, authorization               | Server Components + server-only DAL                           | Validate on every request; never use Zustand or a browser cache as authority                |
| Interactive remote reads and mutations                                                          | TanStack Query through feature hooks and typed Axios adapters | Call same-origin Route Handlers only; query cache is the single client copy of remote state |
| Progressive-enhancement form commands                                                           | Server Actions                                                | Do not create a duplicate Axios endpoint for the same command                               |
| Form values, validation, dirty/touched state                                                    | Form library/local component state                            | Do not mirror form fields into Zustand                                                      |
| Shareable catalog/backoffice filters, search, pagination                                        | URL search parameters                                         | Hooks may parse/update the URL; Zustand is not the source of truth                          |
| Component-local disclosure/selection state                                                      | Local React state                                             | Promote only when multiple distant surfaces genuinely coordinate it                         |
| Cross-route ephemeral UI such as mobile navigation, global drawers/dialogs, and an upload queue | One Zustand store composed from small slices                  | No Auth session, role/status, API entities, forms, secrets, or authorization decisions      |

The browser request layer uses one typed Axios instance for `/api` routes with a bounded timeout, same-origin credentials, request correlation, `AbortSignal` support, and normalized non-sensitive errors. It never calls Supabase Postgres, privileged Supabase APIs, BrasilAPI, or SMTP directly from the browser. TanStack Query feature hooks use stable feature-owned query-key factories, pass the provided cancellation signal to Axios, define bounded retry rules that do not retry authorization/validation failures, and explicitly invalidate or remove affected keys after mutations and moderation changes.

One client `AppProviders` boundary contains the infrastructure providers that are actually necessary: `QueryClientProvider` and a single Zustand store provider composed from UI slices. The server creates a new QueryClient per request and the browser reuses a stable client; `HydrationBoundary` is added only where server prefetch materially improves interactive screens. The Zustand store is also created from a factory at the application boundary so request-specific rendering cannot leak state across SSR requests. React Server Components never read or write the store. Persistence is opt-in per non-sensitive slice and requires a hydration test.

This uses Zustand to replace a collection of business Context providers, not to replace the server, the URL, the form library, or TanStack Query. Selectors subscribe to the smallest state needed, and feature-specific actions remain named in domain language. Custom hooks are tested independently when they contain branching orchestration.

Alternative considered: separate marketing, product, API, and admin applications. Rejected because it multiplies deployments, design drift, auth configuration, and operational cost before the Beta validates demand.

Alternative considered: put all fetching in TanStack Query and all client values in Zustand. Rejected because native Server Components are a better owner for server-rendered reads, URL/form/local state already have clear owners, and duplicating query data in Zustand creates stale competing caches.

### 2. Treat Next.js 16 Proxy as an optimistic gate, never the authorization layer

Next.js 16 renamed Middleware to Proxy. `src/proxy.ts` will refresh Supabase cookies and perform cheap optimistic redirects for clearly unauthenticated requests. It will not query the database, decide sensitive permissions, or expose catalog content.

A server-only Data Access Layer (DAL) performs authoritative checks for every protected read and write:

1. Validate the Supabase access token server-side; do not trust an unverified session payload.
2. Resolve the application account and its role/status.
3. Apply the capability-specific policy (`ADMIN`, approved account, owner, or permitted company contact access).
4. Execute a user-context Drizzle transaction.
5. Return a minimal DTO rather than a raw database row.

Page/layout redirects improve UX, while DAL checks, Server Action checks, and Postgres RLS provide the security boundary. Client components never receive the database URL, service-role key, SMTP credentials, audit snapshots, or fields they cannot display.

Alternative considered: all authorization in `proxy.ts`. Rejected because Proxy is intentionally unsuitable for slow data fetching or complete session/authorization management.

### 3. Use Supabase Auth with one identity system and application-owned roles

Supabase Auth is the credential and session authority for email/password and Google OAuth. `@supabase/ssr` supplies browser/server clients and cookie refresh behavior. Email/password registration starts from an explicit landing-page or registration-form role choice and submits credentials plus the complete role-specific profile in one browser request. The server creates the Auth identity and application profile as one coordinated workflow, compensating the Auth identity if application persistence fails. Email confirmation remains required before that prepared profile can enter moderation. Google users continue after the OAuth callback, choose exactly one role in a blocking first-access modal, and then submit the corresponding profile form. Password recovery uses Supabase Auth templates and the Marques Branding SMTP configuration.

The application role is stored in `accounts.role`, not editable Auth metadata:

- `ADMIN`: backoffice only; never selectable from public onboarding.
- `INFLUENCER`: creator-facing account area. `creator_profiles.creator_type` is exactly one of `INFLUENCER` or `UGC`.
- `COMPANY`: company-facing account area.

An email/password visitor chooses `INFLUENCER` or `COMPANY` before the combined registration submission; the trusted role is written only after Supabase Auth successfully creates the identity. A Google-authenticated non-admin without a role redirects to `/onboarding/role`, where a blocking modal requires the same one-time choice before the role-specific profile form opens. Role selection is a one-time self-service operation in both paths. Changing it later requires an audited administrator operation because profile shape, catalog policy, and moderation evidence differ by role.

`/backoffice/login` is a dedicated administrative entry experience but uses the same Supabase Auth project. A non-admin who authenticates there is signed out of the attempted backoffice flow and receives a generic access-denied response. The initial admin is provisioned by a server-only bootstrap script from an explicit email; later admins are invited/provisioned by an existing admin. Public admin sign-up does not exist.

Alternative considered: a separate admin Auth project. Rejected because it adds identity synchronization and a third hosted environment while role-based access already provides separation.

### 4. Model onboarding and moderation as an explicit state machine

`accounts.status` uses the following values:

| Status              | Meaning                                           | User actions                                                | Catalog visibility                             |
| ------------------- | ------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------- |
| `ONBOARDING`        | Role/profile is incomplete or not yet submitted   | Complete and submit                                         | None                                           |
| `PENDING_REVIEW`    | Submitted and awaiting an administrator           | View submitted data                                         | None; show “Seu cadastro está sendo analisado” |
| `CHANGES_REQUESTED` | Administrator requested corrections with a reason | Edit and resubmit                                           | None; show correction guidance                 |
| `APPROVED`          | Manually approved                                 | Use catalog and edit profile                                | Visible if profile is not archived             |
| `SUSPENDED`         | Temporarily disabled by an administrator          | View account status/support guidance                        | None                                           |
| `BANNED`            | Terminal self-service block                       | No edit, resubmit, or account recreation for known identity | None                                           |

Allowed transitions are centralized in a domain policy and reinforced by a database function/constraint:

```text
ONBOARDING -> PENDING_REVIEW
PENDING_REVIEW -> APPROVED | CHANGES_REQUESTED | BANNED
CHANGES_REQUESTED -> PENDING_REVIEW | BANNED
APPROVED -> SUSPENDED | BANNED
SUSPENDED -> APPROVED | BANNED
```

An administrator can issue a carefully audited override to restore a wrongly banned identity, but the banned user cannot act on their own. “Reject” from the source DOCX is normalized to `CHANGES_REQUESTED` when correction is possible and to `BANNED` only for a terminal block. This removes two ambiguous resubmittable states.

Approved profile edits publish immediately, are audited, and do not reset approval. Administrators can suspend or ban abuse. A later product phase can add draft/published profile versions if re-moderation becomes necessary.

Known banned identities are retained as restricted tombstones and checked by a Supabase Before User Created hook plus post-login defense. The known Supabase user is also administratively banned and active sessions are revoked where supported. This prevents reuse of the same normalized email/provider identity; preventing a person from using a new identity would be automated antifraud and remains out of scope.

### 5. Use a normalized Postgres model with immutable history

Supabase `auth.users` stores credentials and provider identities. Public business data uses UUID primary keys, `created_at`, `updated_at`, optimistic `version`, and soft-archive fields where applicable.

Core model:

| Table                                  | Purpose and principal fields                                                                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `accounts`                             | `auth_user_id`, role, status, email mirror for operations, moderation timestamps, completion percentage, `archived_at`                          |
| `creator_profiles`                     | account FK, legal/display name, WhatsApp, bio, creator type, primary city/UF, cover/avatar asset FKs, highlighted flag/order                    |
| `company_profiles`                     | account FK, legal name, trade name, CNPJ, employee range, segment, WhatsApp, description, website, logo/cover asset FKs, highlighted flag/order |
| `company_locations`                    | company FK, label, address fields, city, UF, primary flag; supports multiple cities                                                             |
| `niches` / `creator_niches`            | seeded filter taxonomy and creator assignments                                                                                                  |
| `social_profiles`                      | owner account, platform, handle, normalized URL, visibility/order                                                                               |
| `creator_metric_snapshots`             | creator, social profile/platform, follower count, engagement rate, observed date, source `SELF_REPORTED`                                        |
| `media_assets`                         | owner, bucket/path, kind, MIME, size, dimensions, status, replacement/archival data                                                             |
| `moderation_cases`                     | account, current submission sequence, assigned admin, submitted/resolved timestamps                                                             |
| `moderation_events`                    | case, from/to status, action, reason, actor, immutable timestamp                                                                                |
| `sponsorship_placements`               | placement type, advertiser reference/label, audience, creative, link, start/end, active flag, order                                             |
| `email_outbox` / `email_attempts`      | template, recipient, idempotency key, payload, state, attempts, safe error metadata                                                             |
| `legal_documents` / `account_consents` | document type/version/hash/URL and account acceptance timestamp/context                                                                         |
| `blocked_identities`                   | normalized identity/provider reference, originating account, reason, blocked/unblocked audit fields                                             |
| `audit_revisions`                      | monotonic revision, entity, operation, actor/source/request, reason, changed fields, redacted before/after JSON                                 |

The initial “everyone has five stars” DOCX field is intentionally omitted because ratings/reputation are explicitly out of scope. Future transaction entities are not prebuilt; stable UUIDs and clear aggregate boundaries are enough to avoid coupling future features to today’s tables.

Indexes cover role/status queues, active catalog profiles, creator type, city/UF, niches, normalized search text, sponsorship schedule/order, outbox state, and audit entity/time. `unaccent` and trigram support provide accent-insensitive Portuguese name search without a hosted search service. Catalog requests use bounded cursor pagination rather than loading the full directory.

### 6. Keep Supabase SQL migrations authoritative and Drizzle authoritative at runtime

Drizzle ORM supplies typed schemas, relations, queries, transactions, and DTO mapping. Timestamped SQL files under `supabase/migrations/` remain the deployment source of truth because the schema also requires Postgres extensions, RLS, Auth hooks, Storage policies, database functions, and audit triggers that exceed ordinary table generation.

Every schema change updates the Drizzle schema and a matching Supabase migration in the same tested slice. `drizzle-kit` can generate a table/index starting point, but generated SQL is reviewed and incorporated into the timestamped Supabase migration; `drizzle-kit push` is forbidden for shared development and production. CI recreates the local database from migrations, type-checks the Drizzle model, and runs integration tests to detect drift.

Runtime Vercel traffic uses the Supavisor transaction pooler through `postgres-js` with prepared statements disabled (`prepare: false`). Migration/administrative commands use the direct or supported session connection. Runtime database access is server-only.

A user-context Drizzle wrapper validates the Supabase token, then starts a transaction that sets the verified JWT claims and local role for RLS before executing the callback. Separate narrowly scoped admin clients exist only for Auth administration and migration/bootstrap jobs; service-role material never reaches a browser.

Alternative considered: make Drizzle migrations the only schema mechanism. Rejected because Auth/Storage policies, hooks, and trigger-heavy auditing would still require manually managed SQL and a second deployment path.

### 7. Apply RLS and least privilege as defense in depth

RLS is enabled on every exposed public table and on Storage objects. Policies implement these boundaries:

- Account owners can read/update allowed fields on their own profile while status/role/moderation fields remain server-controlled.
- Approved `INFLUENCER` and `COMPANY` accounts can read approved, non-archived creator catalog DTO data.
- Only approved `COMPANY` accounts can receive creator contact DTO fields such as WhatsApp and contact email.
- Approved `INFLUENCER` accounts can read approved company carousel DTOs, not company private/CNPJ/contact data.
- `ADMIN` can access backoffice data through server-only authorized paths.
- Audit revisions, blocked identities, moderation internals, email payloads, and consent context are never exposed directly to normal clients.
- Anonymous users cannot select creator/company profile rows, media object listings, or company logos.

Application DAL policies mirror database policies so authorization failures are explicit and testable. Raw database objects are never serialized to Client Components.

### 8. Store profile and sponsorship media in private Supabase buckets

Use private `profile-media` and `sponsorship-media` buckets. Object paths are non-guessable and owner-scoped, for example `<account-id>/<kind>/<uuid>.webp`. Upload authorization requires ownership and valid onboarding status; admin sponsorship uploads require `ADMIN`.

The browser performs crop/preview and optional compression, but the server validates declared MIME, extension, size, and ownership metadata before the asset becomes active. Initial limits are 5 MB for avatar/logo and 8 MB for covers/sponsorship creatives, accepting JPEG, PNG, and WebP. Replacements create a new object and archive the old asset so history never points to silently overwritten bytes.

Catalog DTOs receive short-lived signed URLs or a controlled media delivery URL. Anonymous public access and bucket listing remain disabled. Storage RLS is tested against cross-account read/write/delete attempts.

Alternative considered: public buckets for simpler image URLs. Rejected because public URLs would bypass the approved-only catalog rule.

### 9. Treat BrasilAPI as optional form assistance

`/api/company-registry/cnpj/[cnpj]` is an authenticated server-side adapter, not a client-to-provider call. It:

1. normalizes input and validates the 14-digit CNPJ checksum;
2. rate-limits by authenticated account and a privacy-preserving network key;
3. applies a short timeout and bounded retry policy;
4. caches successful minimal responses for a limited period;
5. maps only useful public fields into an internal DTO;
6. returns typed unavailable/not-found/invalid responses;
7. never marks a company legitimate or approved.

The UI waits for a complete valid CNPJ and shows explicit loading, success, unavailable, and manual-entry states. Autofilled fields remain editable and the user confirms them before submission. Raw provider responses are not persisted in business or audit tables. Manual moderation remains authoritative.

Alternative considered: block onboarding when lookup fails. Rejected because BrasilAPI is experimental and a free external dependency must not become a single point of onboarding failure.

### 10. Build role-specific onboarding and profile completion

Shared onboarding fields include verified email, WhatsApp, legal consent, and submission acknowledgement. Influencer fields include name, creator type (exactly one of `INFLUENCER`/`UGC`), bio, city/UF, niches, social links, self-reported follower/engagement metrics, avatar, and cover. Company fields include legal/trade name, CNPJ, employee range, segment, WhatsApp, description, one or more locations, website/social links, logo, and cover.

Required review fields are validated on both client and server. Optional completion fields can be added after approval. A deterministic completion service assigns weighted required/optional fields and returns the percentage plus missing-field checklist; the same service powers profile UI and admin metrics.

Forms preserve safe progress as drafts in Postgres, use optimistic concurrency through the row version, and provide accessible validation summaries. Submission is atomic: validate draft, capture consent, open/update the moderation case, transition status, write revisions, and enqueue email.

### 11. Keep the public landing content-led and catalog data private

The landing follows the useful information architecture observed in the Noovid reference—strong proposition, audience paths, problem/benefit framing, simple process, repeated CTA, and trust-oriented legal/footer content—without copying its branding, claims, pricing, content, or transactional features.

Initial sections:

- Header with brand navigation and “Entrar”.
- Hero with proposition and “Sou influencer” / “Sou empresa” paths.
- Benefits/problem framing for both audiences.
- Optional precomputed privacy-safe aggregate counters (for example, approved creators and companies) with no names, logos, cards, or drill-down, rendered only when configured and meaningful.
- Three- or four-step “Como funciona”.
- Optional precomputed generic top sponsorship creative managed by admin.
- Final CTA and footer with privacy/terms/contact links.

The page must not query or render creator cards, creator names, creator photos, creator metrics, company names, or company logos. A server-side feature flag `publicSocialProofEnabled` defaults to false and is not exposed as a Beta backoffice control. Enabling public profile/logo proof requires a later reviewed spec change and appropriate consent.

The root page is prerendered as static content during the application build and
has no request-time dependency on Supabase Auth, Postgres, user provisioning,
aggregate counters, or sponsorship delivery. The route opts into a strict
static-rendering contract so a future request-time API or uncached backend read
fails the build instead of silently making the landing dependent on a healthy
backend. Static native links continue to expose registration and login entry
points even while those application capabilities are unavailable.

Long/narrow landing layouts keep an accessible persistent “Entrar” affordance through the header and, where it does not obscure content or assistive interaction, a sticky/floating mobile treatment. The final position follows the brand/UX pass, but login entry must remain easy to find.

### 12. Implement a private, role-aware catalog

Only `APPROVED` accounts can query catalog DTOs. Other authenticated statuses enter the product shell but receive a full-page status experience instead of list/card/detail payloads. Server components must not fetch the protected dataset before status authorization succeeds.

Both approved roles see approved creators with name search and filters for niche, social network, city/UF, and exclusive creator type. Result pages include active applicable sponsorship slots and cursor pagination. Cards show only approved display data and media.

Role differences:

- `COMPANY`: sees creator profiles and external contact actions (WhatsApp, email, and social link) subject to the creator’s explicit contact visibility consent.
- `INFLUENCER`: sees other creators and an approved company-logo carousel; does not receive company CNPJ/private contact fields or creator private contact DTOs.

Search/filter state is encoded in the URL for navigation and sharing inside authenticated sessions. Loading skeletons, no-result guidance, recoverable error states, and filters usable on touch screens are mandatory.

### 13. Manage sponsorship placements without implementing commerce

Administrators manage top banner, side banner, carousel, and featured-creator placements. Each placement has an audience, optional advertiser/profile reference, title/body/image/link creative, start/end timestamps, active state, and manual order. A placement renders only when active, within schedule, compatible with the viewer/route, and backed by a valid creative.

The system records no price, payment, invoice, entitlement, commission, or automatic renewal. Commercial agreements occur outside the application. External links are restricted to safe HTTP(S) URLs, open with appropriate security attributes, and are auditable.

Desktop-only “side” concepts become inline cards between result groups or other deliberate mobile placements rather than squeezed sidebars. Rendering a sponsorship must not reveal a private profile to an unauthorized audience.

### 14. Use one backoffice with multi-admin authorization

The `/backoffice` dashboard contains:

- queue counts and separate influencer/company moderation views;
- full submitted-profile review with audit context;
- approve, request corrections, suspend, restore, ban, archive, and profile-edit actions;
- reason requirements for correction, suspension, ban, unban, and destructive-looking operations;
- searchable/filterable account management;
- sponsorship CRUD, scheduling, ordering, and preview;
- totals by role/status, new registrations by period, profile completion rate, and pending queue size;
- audit history filtered by entity, actor, action, and period;
- email outbox failure visibility and controlled retry.

All listing views use server-side pagination/filtering. Bulk approval is not included. Destructive-looking actions use confirmation dialogs and remain soft/recoverable except the user-facing terminal semantics of `BANNED`.

### 15. Use database-backed moderation transitions and Envers-style revisions

Sensitive state transitions execute through a single transaction or database function that validates the state machine and reason, writes `moderation_events`, updates `accounts`, creates an `audit_revisions` entry, and inserts the email outbox record. This prevents approval without history or notification intent.

Database triggers cover inserts, updates, and soft deletes on meaningful business tables. The application begins every write transaction by setting local audit context: verified actor account, actor role/type, request ID, source surface, and optional reason. Triggers calculate changed fields and redacted before/after JSON. Missing actor context is recorded as `SYSTEM_UNKNOWN` and raises structured telemetry; privileged moderation functions reject missing actor/reason where required.

Audit data is append-only. Application roles cannot update/delete it. Redaction excludes password/auth data, access/refresh tokens, SMTP/provider secrets, signed URLs, raw CNPJ-provider payloads, and email bodies where a template key plus safe payload is sufficient. Audit reads are admin-only and paginated. Production retention/anonymization policy is a launch input owned by the client/legal contact; no unaudited purge is allowed.

### 16. Split Auth email and application email while using the same SMTP authority

Supabase Auth is configured with Marques Branding SMTP for confirmation, recovery, and Auth-managed messages. Application lifecycle messages use a server-only SMTP adapter (Nodemailer-compatible) with React-based, `pt-BR` templates.

An outbox pattern avoids coupling business success to SMTP availability:

1. the domain transaction inserts an idempotent outbox item;
2. the application attempts immediate delivery after commit;
3. failures remain pending with bounded exponential retry metadata;
4. a signed Vercel scheduled endpoint and an admin retry action process due items;
5. attempts record safe SMTP response metadata, not credentials or full sensitive bodies.

Local Supabase email capture is used for Auth testing and a local SMTP catcher receives application mail. Development and production use isolated SMTP/config variables; development subjects/headers clearly identify non-production traffic.

### 17. Standardize mobile-first UI, accessibility, and language quality

Tailwind CSS 4 supplies design tokens through CSS variables and shadcn/ui supplies accessible primitives that the project owns and can adapt. Tokens cover brand colors, typography, spacing, radii, shadows, focus rings, motion, and light/dark-compatible semantic roles; the initial Beta does not require a user-selectable dark mode unless brand design later requests it.

Components start at 320 px layouts and enhance at content-driven breakpoints. Navigation, forms, filter sheets, cards, tables, confirmation dialogs, toasts, and status screens are designed for touch. Backoffice data tables have mobile card/list alternatives instead of horizontal overflow as the only solution.

Acceptance targets include WCAG 2.2 AA color/focus/keyboard semantics, reduced-motion respect, meaningful alt text, accessible error summaries, 44 px touch targets, no horizontal page scroll at supported widths, and correct `pt-BR` formatting for dates, numbers, percentages, CNPJ, and phone values.

### 18. Enforce TDD with layered automated checks

Every implementation slice begins with a failing test for the intended behavior, then the minimum implementation, then refactoring. The suite is layered:

- **Unit:** state transitions, permissions, validation, completion weights, search normalization, sponsorship schedules, audit redaction, template mapping.
- **Hook/store:** custom hook branches, Axios error/cancellation behavior, TanStack Query keys/invalidation/retry, URL synchronization, Zustand selectors/actions, SSR isolation, and optional persistence hydration.
- **Component:** shadcn-based form/status/filter/table interactions with React Testing Library and accessibility assertions, using feature hooks through controlled test clients.
- **Integration:** Drizzle queries, RLS policies, triggers, storage policies, Auth hooks, outbox idempotency, and migrations against the local Supabase stack.
- **Contract:** mocked/recorded BrasilAPI and SMTP adapters, including timeouts and malformed responses.
- **E2E:** Playwright journeys for email/Google callback substitutes, both onboarding roles, correction/resubmission, approval, pending fallback, catalog permissions, profile edits, sponsorships, admin operations, and bans.
- **Visual/responsive/a11y:** representative 320/390/768/1440 widths, Chromium and WebKit for critical flows, axe checks, screenshots for stable status/form/catalog states.

CI gates formatting, lint, type-check, unit/component tests, local migration reset, integration tests, production build, E2E smoke, and dependency/security review. Critical authorization and state-machine branches require explicit tests even if aggregate coverage is high. Test fixtures are synthetic and contain no production personal data.

### 19. Operate three isolated stages with migration-first delivery

| Stage       | Next.js                        | Supabase                         | Email                                   | Data                         |
| ----------- | ------------------------------ | -------------------------------- | --------------------------------------- | ---------------------------- |
| Local       | `localhost`                    | Supabase CLI/Docker              | Local catchers                          | Deterministic synthetic seed |
| Development | Vercel `contente-creators-dev` | Supabase `contente-creators-dev` | Marques SMTP non-prod identity/config   | Disposable QA data           |
| Production  | Vercel `contente-creators-prd` | Supabase `contente-creators-prd` | Marques SMTP production identity/config | Client production data       |

Each stage has independent URLs, publishable keys, database credentials, service-role secrets, Google OAuth callbacks, SMTP credentials, storage buckets/policies, and rate limits. Secrets live in local ignored files, Vercel encrypted environment variables, Supabase secrets/config, and CI secret stores—never committed.

Proposed branch promotion is `develop` to hosted development and protected `main` to production. Pull requests run against local services; previews that share hosted development are not used for destructive/migration tests. Production deployment requires green CI, reviewed migration dry run, migration compatibility check, and a post-deploy smoke test.

Alternative considered: one Supabase project with schemas per environment. Rejected because Auth users, Storage objects, policies, secrets, and accidental data access would not be safely isolated.

### 20. Add observability without exposing personal data

Use structured server logs with request IDs, route/action names, result categories, duration, role/status categories, and redacted error causes. Health checks cover application liveness and optionally dependency readiness without leaking configuration. High-value events include authentication failures, moderation transitions, banned-identity attempts, CNPJ provider availability, outbox failures, migration status, and authorization denials.

No email, WhatsApp, CNPJ, bio, raw provider payload, signed URL, token, password, or SMTP response body is written to logs. Free-tier-compatible platform logs are sufficient initially; an external error tracker can be added only after client account/privacy approval.

## Risks / Trade-offs

- **[Free hosted tiers can pause, throttle, change limits, or lack production recovery/SLA features]** → Validate current limits during provisioning, add usage alerts/runbook checks, keep migrations and export procedures reproducible, and define explicit upgrade triggers before launch traffic.
- **[BrasilAPI is experimental and has no product SLA]** → Use server-side timeout/cache/rate limiting, editable autofill, and an always-available manual path; never use it as moderation evidence.
- **[A banned person can attempt registration with a different identity]** → Block known email/provider identities and revoke known sessions; document that cross-identity detection is automated antifraud and out of scope.
- **[Direct Postgres access from a serverless application can exhaust connections]** → Use Supavisor transaction mode, `prepare: false`, short transactions, bounded query concurrency, and connection monitoring.
- **[RLS context through pooled connections can leak if session state is not local]** → Set verified claims and role only inside transactions with transaction-local configuration, reset in `finally`, and test cross-user isolation under connection reuse.
- **[Immediate publication of edits to approved profiles can expose undesirable content]** → Capture complete revisions, validate all fields/media, allow rapid suspension, and reserve draft/reapproval for a later phase if operations demand it.
- **[Private image delivery adds signed-URL and caching complexity]** → Centralize media DTO generation, use short-lived URLs with server-side caching, and test expiry/replacement behavior.
- **[SMTP failure could otherwise roll back valid moderation actions]** → Use a transactional outbox, idempotency, retries, and backoffice visibility; business state is committed independently of delivery.
- **[Trigger-based audit logs can grow quickly and contain personal data snapshots]** → Redact sensitive keys, index bounded access patterns, monitor size, define client-approved retention/anonymization before production, and never expose raw revisions to normal users.
- **[Maintaining SQL migrations and Drizzle schema can drift]** → Change both in one slice, rebuild local DB in CI, run schema-aware integration tests, and prohibit dashboard-only/shared-environment schema edits.
- **[Two Vercel and two Supabase projects increase configuration work]** → Maintain an environment matrix, scripted verification, exact naming, and per-stage smoke checklist.
- **[Google OAuth and SMTP require client-owned external configuration]** → Track callback URLs, sender DNS/authentication, branding verification, and credentials as launch gates rather than hardcoding developer accounts.
- **[Public sponsorship creative might inadvertently reveal a private participant]** → Validate placement audience and creative content; the server refuses profile-derived public placements while public social proof is disabled.
- **[Mobile backoffice tables can become unusable]** → Provide card/list presentations and bottom-sheet filters/actions, not desktop tables shrunk to a narrow viewport.
- **[TDD can degrade into coverage-only testing]** → Organize tasks as test-first slices, require behavior/authorization scenarios before implementation, and review test quality separately from numeric coverage.
- **[TanStack Query and Server Components can create two unsynchronized render sources]** → Assign ownership per screen, use Server Components as a prefetch boundary only for client-owned query data, render that data through the query hook, and never mirror query results into Zustand.
- **[A global Zustand module can leak or hydrate incorrectly under SSR]** → Create the store through the single application provider, keep it client-only and free of request/auth data, use narrow selectors, and test request isolation plus any persisted slice.
- **[Vertical slices can become duplicated mini-applications or import each other internally]** → Require small public APIs, domain-neutral extraction criteria for `shared/`, server-only guards, and automated boundary checks.
- **[Axios Route Handlers can duplicate Server Actions and add avoidable network hops]** → Choose one command transport per use case and retain native server fetching/actions unless client-driven caching, cancellation, polling, or incremental pagination justifies the API route.

## Migration Plan

The current application has no production data, so migration is an additive greenfield rollout.

1. **Foundation:** lock package/runtime versions; establish vertical-slice boundaries and public APIs; add the shared Axios/TanStack Query layer, single Zustand application store, environment validation, shadcn/Tailwind tokens, test harnesses, local Supabase configuration, synthetic seeds, and CI.
2. **Database baseline:** create extensions, enums, normalized tables, indexes, RLS, Storage buckets/policies, Auth hooks, state-transition functions, audit triggers, and Drizzle schemas. Prove a clean `supabase db reset` and integration suite.
3. **Identity slice:** configure local Auth, email/password confirmation, Google OAuth callbacks, SSR clients, Proxy refresh, DAL authorization, role selection, admin bootstrap, and banned-identity hook.
4. **Onboarding slice:** implement influencer/company drafts, CNPJ adapter, consent, media uploads, completion service, submission transaction, pending experience, and outbox.
5. **Backoffice moderation slice:** add queues, full review, corrections, resubmission, approval, suspension/restore, bans, account management, audit views, and email retries.
6. **Catalog slice:** implement approved-only creator queries, search/filters/pagination, role-specific DTOs, detail/contact rules, company carousel, and unapproved fallbacks.
7. **Marketing and sponsorship slice:** build the no-listing landing, legal pages, metadata, placement CRUD/scheduling, responsive placements, and public-profile guard.
8. **Analytics and hardening:** add dashboard metrics, accessibility/responsive/performance passes, abuse controls, observability, backup/export runbook, and complete E2E coverage.
9. **Hosted development:** provision client-owned `contente-creators-dev` projects, configure Google/SMTP/DNS, apply migrations, seed QA data, deploy, and run acceptance tests.
10. **Production:** provision `contente-creators-prd`, verify secrets/callbacks/storage policies/email deliverability/legal copy, dry-run migrations, deploy with approval, run smoke tests, and monitor.

Database migrations use expand/contract discipline. Rollback prefers reverting application code while keeping backward-compatible schema; destructive schema changes require a later migration and verified export/backup. If a production migration fails, stop deployment, preserve logs, restore application compatibility, and roll forward with a corrective migration rather than rewriting applied history.

## Open Questions

No product-behavior questions block implementation. The following client-owned inputs are tracked as launch gates and can use safe placeholders in local development:

- Final brand tokens, logo assets, photography/illustration direction, and approved `pt-BR` marketing copy.
- Production domain, support/privacy contact, Terms of Use, Privacy Policy, consent wording, audit retention, and data-subject request procedure approved by the client/legal owner.
- Client-owned Supabase, Vercel, Google OAuth, DNS, and Marques Branding SMTP accounts/credentials; production sender name/address and SPF/DKIM/DMARC readiness.
- Initial admin email identities, niche taxonomy, employee-count ranges, sponsorship creative inventory, and any launch seed profiles.
- Confirmed free-tier capacity thresholds that trigger a move to paid Supabase/Vercel features, especially backups, availability, storage, bandwidth, email volume, and scheduled processing.

## Reference Inputs

- Product/market references: [MIS](https://mis-app.com/), [Noovid](https://noovid.com/pt-br), and the [YOUPIX Creator Economy map](https://youpix.com.br/mapa-da-creator-economy-br/). They inform positioning and information architecture only; they do not expand Beta scope.
- Framework rules: the installed Next.js 16 documentation under `node_modules/next/dist/docs/`, especially Proxy, authentication, and data-security guidance.
- Platform guidance: [Supabase SSR Auth](https://supabase.com/docs/guides/auth/server-side/nextjs), [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [local development](https://supabase.com/docs/guides/local-development/cli/getting-started), [environment management](https://supabase.com/docs/guides/deployment/managing-environments), and [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).
- Data-layer guidance: [Drizzle with Supabase](https://orm.drizzle.team/docs/get-started/supabase-existing) and [Drizzle RLS](https://orm.drizzle.team/docs/rls).
- Client-state guidance: [TanStack Query advanced SSR](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr), [Zustand with Next.js](https://zustand.docs.pmnd.rs/guides/nextjs), and [Axios instances](https://axios-http.com/docs/instance).

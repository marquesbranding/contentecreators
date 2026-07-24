## 1. Repository, runtime, and dependency foundation

- [x] 1.1 Read and record the relevant installed Next.js 16 guides for project structure, Proxy, authentication, data security, Server Actions, Route Handlers, caching, and deployment before implementation begins. `[platform-delivery]`
- [x] 1.2 Pin the supported Node/npm versions and add `.nvmrc` or equivalent project metadata plus package-engine validation. `[platform-delivery]`
- [x] 1.3 Add npm scripts for format, lint, type-check, unit, component, integration, E2E, accessibility, build, database reset/migrate/seed, and the combined CI gate. `[platform-delivery]`
- [x] 1.4 Install and lock Supabase SSR/client/CLI, Drizzle ORM/Kit, `postgres-js`, Zod/form tooling, Axios, TanStack Query, Zustand, email-template/SMTP, test, Playwright, accessibility, and supporting dependencies after checking current official compatibility. `[platform-delivery]`
- [x] 1.5 Initialize shadcn/ui for Tailwind CSS 4 and add only the primitives required by the first slices. `[platform-delivery]`
- [x] 1.6 Create the vertical feature-slice, domain-neutral shared-kernel, `app` route/composition, database, and test boundaries from `design.md`; establish separate browser-safe/shared `index.ts` and guarded `server.ts` slice public APIs without generating empty slice folders. `[platform-delivery]`
- [x] 1.7 Add typed public/server environment schemas that fail with redacted diagnostics when required values are missing or misplaced. `[platform-delivery]`
- [x] 1.8 Add `.env.example` and environment documentation for local, hosted development, and production without committing any real secret. `[platform-delivery]`
- [x] 1.9 Add a central `pt-BR` copy/formatting layer and tests proving CNPJ, phone, date, number, and percentage formatting while source identifiers remain English. `[platform-delivery]`
- [x] 1.10 Update root metadata/layout to declare `pt-BR`, correct font loading, safe defaults, and protected-route no-index behavior. `[marketing-site] [platform-delivery]`
- [x] 1.11 Add lint/import boundary rules that enforce `app → feature public API → same feature/shared/db`, reject mixed client/server barrels, reverse shared/db-to-feature imports, cross-slice deep imports, client imports of server/db modules, and unauthorized promotion of domain code into `shared/`. `[platform-delivery]`
- [x] 1.12 Build one typed same-origin Axios client with bounded timeout, credentials, request correlation, `AbortSignal`, normalized safe errors, and tests for cancellation/timeout/401/403/422/5xx behavior. `[platform-delivery]`
- [x] 1.13 Configure TanStack Query with per-request server clients, one stable browser client, bounded retry defaults, feature query-key factories, targeted hydration boundaries, and a single application provider. `[platform-delivery]`
- [x] 1.14 Create one factory-built Zustand application store/provider composed from narrow global UI slices and selectors; prohibit Auth, roles/statuses, remote entities, form fields, and secrets, and test SSR request isolation. `[platform-delivery]`
- [x] 1.15 Document and enforce the state-ownership matrix for Server Components/DAL, Server Actions, TanStack Query, URL parameters, form/local state, and Zustand, including the one-command-transport-per-use-case rule. `[platform-delivery]`
- [x] 1.16 Implement one representative slice skeleton with behavior-named `api`, `components`, `hooks`, `domain`, `schemas`, `types`, optional `stores`, and `server/{actions,components,services,repositories,policies,mappers}` files only where required; verify public APIs and dependency lint before other slices copy the pattern. `[platform-delivery]`
- [x] 1.17 Add `docs/architecture/slices.md` mirroring the approved folder contract, dependency graph, naming conventions, server/client boundaries, slice split criteria, and review checklist from `design.md`. `[platform-delivery]`

## 2. Test-first quality harness

- [x] 2.1 Configure Vitest with separate unit, component, and local-integration projects plus coverage reporting. `[platform-delivery]`
- [x] 2.2 Configure React Testing Library, user-event, DOM matchers, cleanup, and deterministic browser API mocks. `[platform-delivery]`
- [x] 2.3 Configure Playwright for desktop/mobile Chromium and critical WebKit projects, trace-on-retry, screenshots, and isolated synthetic users. `[platform-delivery]`
- [x] 2.4 Add axe-based component/E2E accessibility helpers and fail serious/critical violations. `[platform-delivery]`
- [x] 2.5 Add synthetic builders for auth identity, account roles/statuses, creator/company profiles, sponsorships, moderation, consent, and audit records. `[platform-delivery]`
- [x] 2.6 Add a test-first pull-request checklist that requires the initial failing scenario, authorization denial cases, and refactor/green evidence for every behavior slice. `[platform-delivery]`
- [x] 2.7 Set meaningful coverage gates while explicitly requiring critical state-machine/permission branches independent of aggregate percentages. `[platform-delivery]`
- [x] 2.8 Add a smoke test proving the untouched starter can build under the new harness before feature work. `[platform-delivery]`
- [x] 2.9 Add co-located slice test conventions and hook/query/store utilities with isolated QueryClients, Axios mocks, Router/search-parameter fixtures, Zustand store factories, hydration checks, and no cache leakage between tests. `[platform-delivery]`

## 3. Reproducible local Supabase environment

- [x] 3.1 Add the Supabase CLI as a pinned dev dependency and initialize committed `supabase/config.toml`. `[platform-delivery]`
- [x] 3.2 Configure local site/callback URLs, email confirmation, password recovery, Google provider placeholders, Storage limits, and Auth email capture. `[identity-access] [platform-delivery]`
- [x] 3.3 Add a local application SMTP catcher/config separate from Supabase Auth email capture and document both inbox URLs. `[transactional-communications]`
- [x] 3.4 Add deterministic local start/stop/status/reset scripts that never target a linked hosted project implicitly. `[platform-delivery]`
- [x] 3.5 Create synthetic `seed.sql`/seed tooling for admin, influencer, UGC, company, each moderation status, niches, placements, and audit examples with no production data. `[platform-delivery]`
- [x] 3.6 Write an integration test that resets a clean local stack, applies all migrations/seeds, and verifies Auth/Postgres/Storage/email-capture health. `[platform-delivery]`
- [x] 3.7 Document Docker/CLI prerequisites, first start, daily workflow, reset warnings, and local Google OAuth callback setup. `[platform-delivery]`

## 4. Database enums, extensions, and core schema

- [x] 4.1 Write failing schema/integration assertions for required extensions, enums, tables, keys, uniqueness, indexes, and archive/version columns. `[platform-delivery]`
- [x] 4.2 Add the initial timestamped migration for UUID support, `unaccent`, trigram search, and safe helper functions. `[private-catalog] [platform-delivery]`
- [x] 4.3 Add role/status/type/platform/media/placement/outbox/audit enums including `ADMIN`, `INFLUENCER`, `COMPANY` and exclusive creator type `INFLUENCER | UGC`. `[identity-access] [onboarding-profiles]`
- [x] 4.4 Add `accounts` with Auth user linkage, role/status, operational email mirror, approval/submission timestamps, completion/version, and soft archive. `[identity-access] [moderation-lifecycle]`
- [x] 4.5 Add `creator_profiles`, `company_profiles`, and role-consistency constraints. `[onboarding-profiles]`
- [x] 4.6 Add `company_locations` with one-primary-location enforcement and creator city/UF fields. `[onboarding-profiles]`
- [x] 4.7 Add `niches`, `creator_niches`, `social_profiles`, and dated `creator_metric_snapshots` marked `SELF_REPORTED`. `[onboarding-profiles] [private-catalog]`
- [x] 4.8 Add `media_assets` with owner, path, kind, metadata, status, replacement lineage, and archive fields. `[onboarding-profiles]`
- [x] 4.9 Add `moderation_cases`, immutable `moderation_events`, sequence/version fields, and queue indexes. `[moderation-lifecycle]`
- [x] 4.10 Add `sponsorship_placements` with audience, slot/type, creative, safe link fields, schedule, active state, order, advertiser reference/label, and archive. `[sponsorship-placements]`
- [x] 4.11 Add `email_outbox` and `email_attempts` with unique idempotency keys, due/lock/attempt state, and redacted failure metadata. `[transactional-communications]`
- [x] 4.12 Add `legal_documents`, `account_consents`, and contact-visibility consent modeling. `[audit-compliance]`
- [x] 4.13 Add `blocked_identities` with restricted normalized identity/provider keys and audited block/unblock metadata. `[identity-access] [moderation-lifecycle]`
- [x] 4.14 Add `audit_revisions` with monotonic revision, entity/actor/source/request/reason fields, changed fields, and JSON snapshots. `[audit-compliance]`
- [ ] 4.15 Add catalog/search, moderation queue, placement schedule/order, outbox, and audit lookup indexes and prove intended query plans on representative seed volume. `[private-catalog] [backoffice-operations]`
- [x] 4.16 Mirror the migration in modular Drizzle schemas/relations/types and add a drift-focused integration test. `[platform-delivery]`
- [x] 4.17 Document and enforce that Supabase migrations are authoritative and `drizzle-kit push` is forbidden for shared/production databases. `[platform-delivery]`

## 5. Audit triggers and transaction context

- [x] 5.1 Write failing unit tests for sensitive-key redaction, changed-field calculation, actor/source mapping, and safe DTO presentation. `[audit-compliance]`
- [x] 5.2 Write failing integration tests proving insert/update/soft-delete revisions for every audited business aggregate. `[audit-compliance]`
- [x] 5.3 Implement database redaction and generic revision-trigger functions with before/after JSON and monotonic revisions. `[audit-compliance]`
- [x] 5.4 Attach audit triggers to accounts, both profiles, locations, social/metrics, media, moderation, sponsorships, consent, admin-role, blocked-identity, and outbox-retry changes. `[audit-compliance]`
- [x] 5.5 Implement the server-only Drizzle write wrapper that sets transaction-local verified actor, role/type, source, request ID, and reason. `[audit-compliance]`
- [x] 5.6 Add tests proving pooled connections cannot leak audit/JWT context between transactions. `[audit-compliance] [platform-delivery]`
- [x] 5.7 Enforce append-only permissions for revisions/events and test that normal users and admins cannot update/delete history. `[audit-compliance]`
- [x] 5.8 Add structured telemetry for unexpected `SYSTEM_UNKNOWN` writes without including personal data. `[audit-compliance]`

## 6. Row-level security and database access layer

- [ ] 6.1 Write the RLS permission matrix for anonymous, owner, approved influencer, approved company, admin, suspended, and banned contexts for every exposed table. `[identity-access] [audit-compliance]`
- [ ] 6.2 Write failing local integration tests for owner success, cross-account denial, approved catalog access, contact-field restrictions, admin access, and every non-approved denial. `[private-catalog] [audit-compliance]`
- [ ] 6.3 Enable RLS/default-deny and add least-privilege grants/policies to all exposed application tables. `[audit-compliance] [platform-delivery]`
- [ ] 6.4 Implement the verified Supabase-token-to-transaction-local-claims Drizzle wrapper and reset behavior for Supavisor transaction mode. `[identity-access] [platform-delivery]`
- [x] 6.5 Configure the runtime `postgres-js` client with `prepare: false`, short bounded transactions, and server-only module protection. `[platform-delivery]`
- [ ] 6.6 Create DAL session/account resolvers and minimal DTO conventions with React request-level deduplication where safe. `[identity-access]`
- [ ] 6.7 Add reusable DAL guards for authenticated, owner, approved, role-specific, admin, and allowed-status checks. `[identity-access]`
- [ ] 6.8 Add regression tests proving raw rows/secrets/private fields cannot cross Server Component/Action DTO boundaries. `[audit-compliance]`

## 7. Supabase Storage security and media lifecycle

- [ ] 7.1 Write failing Storage policy tests for anonymous, owner, cross-owner, approved catalog read, admin sponsorship upload, suspended, and banned cases. `[onboarding-profiles] [platform-delivery]`
- [ ] 7.2 Create private `profile-media` and `sponsorship-media` buckets and object-path policies. `[onboarding-profiles] [sponsorship-placements]`
- [ ] 7.3 Implement shared image validation for JPEG/PNG/WebP, declared/actual MIME, extension, avatar/logo 5 MB and cover/sponsorship 8 MB limits. `[onboarding-profiles]`
- [ ] 7.4 Implement owner-scoped upload preparation/finalization actions that create media metadata only after authorization/validation. `[onboarding-profiles]`
- [ ] 7.5 Implement replacement as new object plus archived predecessor and test that historical revisions remain meaningful. `[onboarding-profiles] [audit-compliance]`
- [ ] 7.6 Implement short-lived signed media DTO generation/caching without exposing bucket listing or permanent public URLs. `[private-catalog]`
- [ ] 7.7 Build a tested media-upload custom hook plus accessible crop/preview/progress/error/retry components for avatar, logo, cover, and sponsorship creative without mirroring server media records into Zustand. `[onboarding-profiles] [sponsorship-placements]`
- [ ] 7.8 Add orphan/archived-object cleanup reporting with dry-run-first operation and retention guardrails. `[audit-compliance] [platform-delivery]`

## 8. Supabase Auth and session flows

- [x] 8.1 Write failing tests for email sign-up, email confirmation gating, login errors without enumeration, logout, recovery, callback validation, and Google intent return paths. `[identity-access]`
- [x] 8.2 Implement browser/server Supabase SSR clients with correct cookie adapters and no service-role leakage. `[identity-access]`
- [x] 8.3 Implement Next.js 16 `src/proxy.ts` for Supabase cookie refresh and cheap protected-route redirects while preserving all response cookies/headers. `[identity-access]`
- [x] 8.4 Replace the standalone email/password sign-up with a combined credentials + selected role + role-specific profile form, preserving shared server validation and accessible `pt-BR` states. `[identity-access] [onboarding-profiles]`
- [x] 8.5 Add Google OAuth initiation/callback with allowlisted return destinations and local/dev/prd callback configuration. `[identity-access]`
- [x] 8.6 Add email-confirmation pending/resend experience and server enforcement before profile submission. `[identity-access]`
- [x] 8.7 Add forgot/reset password pages and single-use/expired-token handling without user enumeration. `[identity-access]`
- [x] 8.8 Add secure logout and test that protected data is removed after session termination. `[identity-access]`
- [ ] 8.9 Add dedicated `/backoffice/login` behavior that admits only `ADMIN` after shared Supabase authentication. `[identity-access] [backoffice-operations]`
- [ ] 8.10 Add an idempotent, server-only initial-admin bootstrap script and authorized subsequent-admin provisioning flow with audit. `[identity-access]`

## 9. Role selection and banned-identity enforcement

- [x] 9.1 Write failing domain/action tests for one-time `INFLUENCER`/`COMPANY` selection, public `ADMIN` rejection, role immutability, and safe preserved marketing intent. `[identity-access]`
- [x] 9.2 Present first-access role selection as a blocking accessible modal for roleless Google users, with explicit role consequences. `[identity-access]`
- [x] 9.3 Implement the atomic role-selection action and route decision service for role/status destinations. `[identity-access]`
- [ ] 9.4 Add a database/Auth hook or supported pre-user-creation defense for known blocked identities and test email/Google variants. `[identity-access]`
- [ ] 9.5 Add post-auth banned-account defense, session revocation/administrative Auth ban, and blocked `pt-BR` status experience. `[identity-access] [moderation-lifecycle]`
- [ ] 9.6 Add tests documenting the explicit limitation that another unknown identity is outside automated antifraud scope. `[identity-access]`

## 10. Shared onboarding domain and consent

- [x] 10.1 Write failing Zod/domain tests for shared email, WhatsApp, URL, text lengths, enum, number, and consent rules with safe `pt-BR` messages. `[onboarding-profiles]`
- [ ] 10.2 Implement owner-scoped draft save/load with optimistic version checks and stale-tab conflict handling. `[onboarding-profiles]`
- [ ] 10.3 Add legal-document seeds/fixtures and unselected Terms/Privacy/contact-visibility consent controls. `[audit-compliance]`
- [x] 10.4 Implement version/hash/timestamp consent persistence in the onboarding submission transaction. `[audit-compliance]`
- [ ] 10.5 Implement a role/status route decision component that shows onboarding, analysis, correction, suspended, banned, or approved destinations without premature catalog reads. `[moderation-lifecycle]`
- [ ] 10.6 Build a shared mobile-first form shell with step/progress semantics, accessible error summary, autosave status, leave protection, and submit confirmation. `[onboarding-profiles]`

## 11. Influencer and UGC onboarding/profile

- [x] 11.1 Write failing tests for required review fields and exclusive `INFLUENCER | UGC` creator type. `[onboarding-profiles]`
- [x] 11.2 Define and seed the initial niche taxonomy and supported social-platform enum with client-review placeholders clearly tracked. `[onboarding-profiles]`
- [x] 11.3 Implement influencer schema/actions for name, WhatsApp, creator type, city/UF, niches, bio, and social profiles. `[onboarding-profiles]`
- [x] 11.4 Implement dated self-reported follower/engagement metric snapshots and presentation labels. `[onboarding-profiles]`
- [ ] 11.5 Integrate avatar/cover uploads and replacement into the influencer form. `[onboarding-profiles]`
- [ ] 11.6 Build the responsive influencer onboarding steps with loading, validation, save, restore, empty, and failure states. `[onboarding-profiles]`
- [ ] 11.7 Implement influencer profile read/edit for approved users with immediate audited publication and no status reset. `[onboarding-profiles]`
- [ ] 11.8 Add component/integration tests for narrow mobile, keyboard, stale draft, invalid metrics, social URL normalization, and approved edit audit. `[onboarding-profiles]`

## 12. Company onboarding and CNPJ assistance

- [x] 12.1 Write failing CNPJ normalization/checksum tests including punctuation, invalid digits, and valid examples. `[onboarding-profiles]`
- [x] 12.2 Implement the server-side BrasilAPI adapter/DTO with timeout, bounded retry, typed errors, raw-response minimization, authenticated Google access, and the rate-limited pre-Auth combined-registration exception. `[onboarding-profiles]`
- [x] 12.3 Add per-account or privacy-safe pre-Auth network rate limiting and bounded successful-response caching for CNPJ lookup. `[onboarding-profiles]`
- [x] 12.4 Write contract tests for BrasilAPI success, not found, malformed data, timeout, rate limit, and provider outage. `[onboarding-profiles]`
- [x] 12.5 Implement `/api/company-registry/cnpj/[cnpj]` with authenticated Google access, the bounded combined-registration exception, checksum validation, safe mapping, and observability that omits CNPJ. `[onboarding-profiles]`
- [ ] 12.6 Implement company schema/actions for legal/trade name, CNPJ, employee range, segment, WhatsApp, description, website/social links, and optimistic versioning. `[onboarding-profiles]`
- [ ] 12.7 Implement multiple company locations with exactly one primary location and BrasilAPI field proposals that remain editable. `[onboarding-profiles]`
- [ ] 12.8 Integrate logo/cover uploads and replacement into the company form. `[onboarding-profiles]`
- [x] 12.9 Build a tested company-slice CNPJ query hook using the shared Axios/TanStack Query layer, then expose explicit loading/success/not-found/unavailable/timeout/manual-entry indicators and screen-reader announcements. `[onboarding-profiles]`
- [ ] 12.10 Build the responsive company onboarding/profile edit experience and test manual completion when BrasilAPI is offline. `[onboarding-profiles]`

## 13. Profile completion service

- [ ] 13.1 Define documented versioned completion weights for influencer/UGC and company required/optional fields. `[onboarding-profiles]`
- [ ] 13.2 Write failing unit tests for empty, partial, complete, invalidated, media, location, social, and metric combinations. `[onboarding-profiles]`
- [ ] 13.3 Implement the pure completion calculator returning percentage and missing-field keys. `[onboarding-profiles]`
- [ ] 13.4 Persist/recalculate completion after relevant changes without using it as approval. `[onboarding-profiles]`
- [ ] 13.5 Build owner completion indicator/checklist in correct `pt-BR`. `[onboarding-profiles]`
- [ ] 13.6 Add integration tests proving account detail and dashboard aggregates use the same calculator version. `[onboarding-profiles] [backoffice-operations]`

## 14. Moderation state machine and atomic submission

- [ ] 14.1 Write the complete failing unit test matrix for all allowed/forbidden transitions, required reasons, actor roles, stale versions, and terminal banned behavior. `[moderation-lifecycle]`
- [ ] 14.2 Implement the pure moderation policy and typed commands/results. `[moderation-lifecycle]`
- [ ] 14.3 Add database constraints/functions that reinforce allowed transitions and reason/actor requirements. `[moderation-lifecycle]`
- [x] 14.4 Implement first submission as one transaction: validation, consent, case/event, `PENDING_REVIEW`, audit, and outbox intent. `[moderation-lifecycle]`
- [ ] 14.5 Implement `CHANGES_REQUESTED` owner edit/resubmission with incremented submission sequence and preserved history. `[moderation-lifecycle]`
- [ ] 14.6 Implement idempotency keys and stale-profile-version protection for user/admin moderation commands. `[moderation-lifecycle]`
- [ ] 14.7 Implement approval, correction request, suspension, restoration, ban, exceptional unban, and archive transactions. `[moderation-lifecycle]`
- [ ] 14.8 Implement blocked-identity creation/removal and Auth session/ban side effects for ban/unban with retryable operational handling. `[moderation-lifecycle] [identity-access]`
- [ ] 14.9 Add integration tests proving every transition atomically creates the correct event, revision, outbox item, cache invalidation, and visibility. `[moderation-lifecycle]`
- [ ] 14.10 Build status experiences for pending (“Seu cadastro está sendo analisado”), changes requested, suspended, and banned states. `[moderation-lifecycle]`

## 15. Transactional email and SMTP outbox

- [ ] 15.1 Define `pt-BR` template contracts and write rendering tests for onboarding received, changes requested, approval, suspension, restoration, ban, and admin invite/provisioning as applicable. `[transactional-communications]`
- [ ] 15.2 Implement responsive branded email templates with safe absolute environment URLs and no unnecessary personal data. `[transactional-communications]`
- [ ] 15.3 Implement the Marques Branding SMTP adapter with TLS/auth validation, timeouts, redacted failures, and injectable local transport. `[transactional-communications]`
- [ ] 15.4 Implement outbox claim/lock/send/success/failure/retry logic with bounded exponential backoff and concurrency tests. `[transactional-communications]`
- [ ] 15.5 Add immediate post-commit delivery attempts that never roll back the business event. `[transactional-communications]`
- [ ] 15.6 Add the signed scheduled processing Route Handler and reject missing/invalid signatures. `[transactional-communications]`
- [ ] 15.7 Add admin-only manual retry with audit and duplicate-send protection. `[transactional-communications] [backoffice-operations]`
- [ ] 15.8 Configure/test local Auth and application email catchers for full registration/moderation journeys. `[transactional-communications]`
- [ ] 15.9 Create Supabase `pt-BR` confirmation/recovery/invite templates and per-environment redirect configuration documentation. `[transactional-communications]`
- [ ] 15.10 Add development/production SMTP verification checklist including sender, SPF, DKIM, DMARC, rate limits, and deliverability tests. `[transactional-communications]`

## 16. Backoffice shell and moderation operations

- [ ] 16.1 Write failing authorization/component tests for backoffice navigation, direct reads/actions, revoked admin, and concurrent admin attribution. `[backoffice-operations]`
- [ ] 16.2 Build the responsive backoffice shell with mobile navigation, breadcrumbs, loading/error boundaries, and accessible action feedback. `[backoffice-operations]`
- [ ] 16.3 Implement server-paginated influencer/company moderation queue Route Handler/queries with status/search/order URL filters, stable query keys, queue counts, authorization, and cancellation. `[backoffice-operations]`
- [ ] 16.4 Build a moderation-queue query hook, desktop table, and equivalent card/list controls on mobile without hiding required data or copying results into Zustand. `[backoffice-operations]`
- [ ] 16.5 Implement full submission review DTO/page including profile/media, consent summary, CNPJ-assistance disclaimer, completion, current version, and moderation history. `[backoffice-operations]`
- [ ] 16.6 Build approve/request-corrections actions with mandatory confirmation/reason and stale-review handling. `[backoffice-operations] [moderation-lifecycle]`
- [ ] 16.7 Build suspend/restore/ban/exceptional-unban/archive actions with mandatory reasons and explicit consequences. `[backoffice-operations] [moderation-lifecycle]`
- [ ] 16.8 Add mobile/keyboard/screen-reader tests for reviewing and deciding an influencer and company submission. `[backoffice-operations]`
- [ ] 16.9 Verify no bulk approval/ban controls or endpoints exist while commands remain reusable for a future change. `[backoffice-operations]`

## 17. Backoffice account management, audit, and operations

- [ ] 17.1 Implement server-paginated account search/filter by role/status/archive with URL-owned filters, safe summary DTOs, and a tested backoffice query hook. `[backoffice-operations]`
- [ ] 17.2 Build account list/detail pages showing authorized full profile, status, completion, moderation, media, consent, and safe operational metadata. `[backoffice-operations]`
- [ ] 17.3 Implement admin profile edits through the same validation/audit pipeline as owner edits. `[backoffice-operations] [audit-compliance]`
- [ ] 17.4 Implement append-only audit query DTOs and filters by entity/record/actor/action/source/period. `[audit-compliance]`
- [ ] 17.5 Build the audit history page/diff presentation with redacted before/after fields and no mutation controls. `[audit-compliance]`
- [ ] 17.6 Implement email-outbox pending/failed list, attempt detail, and eligible manual retry presentation. `[transactional-communications]`
- [ ] 17.7 Add cross-role/security tests proving no normal user can read account management, audit, blocked identity, or outbox data. `[backoffice-operations] [audit-compliance]`

## 18. Approved-only creator catalog data layer

- [ ] 18.1 Write failing query/authorization tests for every account status, role, archive state, creator type, self-exclusion, and company-carousel privacy rule. `[private-catalog]`
- [ ] 18.2 Implement accent/case-insensitive normalized creator name search backed by indexed PostgreSQL helpers. `[private-catalog]`
- [ ] 18.3 Implement composable filters for niche, social network, city/UF, and exclusive creator type. `[private-catalog]`
- [ ] 18.4 Implement stable bounded cursor pagination, default/max page limits, deterministic ordering, and invalid-cursor handling. `[private-catalog]`
- [ ] 18.5 Implement creator card/detail DTOs that exclude raw account/moderation/audit/private fields. `[private-catalog]`
- [ ] 18.6 Implement `COMPANY` contact DTOs/actions gated by `APPROVED` status and creator contact consent. `[private-catalog]`
- [ ] 18.7 Implement `INFLUENCER` creator list excluding self and approved company-logo carousel without CNPJ/private contacts. `[private-catalog]`
- [ ] 18.8 Implement catalog/detail cache invalidation or non-cache policy proving suspended/banned/archived profiles disappear immediately. `[private-catalog] [moderation-lifecycle]`
- [ ] 18.9 Add representative-volume query-plan/performance tests for default, name, niche, city, network, and combined filters. `[private-catalog] [platform-delivery]`

## 19. Catalog and profile user interface

- [ ] 19.1 Write failing hook/component tests for query-key stability, cancellation, invalidation/removal after eligibility loss, hydrated initial data, URL filter state, loading, no results, error/retry, cursor navigation, mobile sheet, and role-specific controls. `[private-catalog]`
- [ ] 19.2 Build the approved catalog Server Component authorization/prefetch boundary and client query view so authorization completes before protected execution and query data has only one render owner. `[private-catalog]`
- [ ] 19.3 Build responsive creator cards with authorized signed media, creator type, niche/location, and self-reported metric labeling. `[private-catalog]`
- [ ] 19.4 Build a catalog custom hook plus touch-friendly filter/search controls with URL-owned state, active-filter chips, clear action, and accessible async announcements. `[private-catalog]`
- [ ] 19.5 Build stable cursor navigation/infinite-query enhancement with Axios cancellation and bounded pages without loading the whole catalog. `[private-catalog]`
- [ ] 19.6 Build creator detail with role-specific contact/social controls and safe unavailable state after loss of eligibility. `[private-catalog]`
- [ ] 19.7 Build the approved influencer-only company-logo carousel with private signed media. `[private-catalog]`
- [ ] 19.8 Build loading skeleton, first-empty, filtered-empty, recoverable error, stale-authorization-clearing, and retry states in `pt-BR`. `[private-catalog]`
- [ ] 19.9 Add responsive/accessibility tests at 320, 390, 768, and 1440 px plus critical WebKit behavior. `[private-catalog] [platform-delivery]`

## 20. Sponsorship placement management and rendering

- [ ] 20.1 Write failing domain tests for placement type, creative completeness, URL safety, schedule boundaries, audience/route, order ties, referenced eligibility, and public privacy. `[sponsorship-placements]`
- [ ] 20.2 Implement placement validation, eligibility, deterministic ordering, and UTC schedule evaluation. `[sponsorship-placements]`
- [ ] 20.3 Implement admin placement CRUD/soft removal with audit, optimistic version checks, and private media. `[sponsorship-placements]`
- [ ] 20.4 Build backoffice placement list/filter/create/edit/preview/activate/deactivate/reorder experiences. `[sponsorship-placements] [backoffice-operations]`
- [ ] 20.5 Implement top, inline-mobile side, carousel, and featured-creator renderers with audience/route checks. `[sponsorship-placements]`
- [ ] 20.6 Suppress placements referencing ineligible profiles and participant-derived public creatives while social proof is disabled. `[sponsorship-placements]`
- [ ] 20.7 Add tests proving no sponsorship price/payment/invoice/commission/split/renewal fields or workflows exist. `[sponsorship-placements]`
- [ ] 20.8 Add responsive/keyboard/screen-reader tests for creative preview, catalog slots, and narrow mobile inline placement. `[sponsorship-placements]`

## 21. Public marketing and legal experience

- [x] 21.1 Write failing route/data tests proving anonymous public pages never query or serialize participant/profile/logo listing data. `[marketing-site]`
- [x] 21.2 Distill approved brand assets/tokens and create the mobile-first marketing visual system without copying competitor branding or unsupported claims. `[marketing-site]`
- [x] 21.3 Build header/hero with “Sou influencer”, “Sou empresa”, and “Entrar”, routing the untrusted intent to the matching combined registration variant. `[marketing-site]`
- [x] 21.4 Build audience benefit/problem sections and a concise three- or four-step “Como funciona” sequence. `[marketing-site]`
- [ ] 21.5 Add the optional generic public promotional slot with protected-profile suppression. `[marketing-site] [sponsorship-placements]`
- [ ] 21.6 Build final CTA/footer with approved support/privacy contact, Terms, and Privacy routes. `[marketing-site] [audit-compliance]`
- [x] 21.7 Add page metadata, canonical, Open Graph image/assets, sitemap, robots, and protected-route noindex verification. `[marketing-site]`
- [x] 21.8 Add an immutable server-side `publicSocialProofEnabled=false` configuration and tests proving no Beta backoffice toggle exists. `[marketing-site]`
- [x] 21.9 Add responsive, keyboard, reduced-motion, axe, and screenshot tests at representative widths. `[marketing-site] [platform-delivery]`
- [ ] 21.10 Implement privacy-safe optional aggregate counters with no participant identity, links, or catalog payload and hide empty/misleading values. `[marketing-site]`
- [x] 21.11 Implement/test a persistent accessible “Entrar” affordance for long/narrow landing layouts without obscuring content. `[marketing-site]`

## 22. Admin analytics dashboard

- [ ] 22.1 Write failing metric-definition tests for totals by role/status, pending queue, new registrations by period, archive exclusion, and completion rate. `[backoffice-operations]`
- [ ] 22.2 Implement indexed aggregate queries with explicit timezone/period boundaries and safe admin DTOs. `[backoffice-operations]`
- [ ] 22.3 Build a dashboard query hook plus summary cards, role/status breakdown, URL-owned registration period, completion rate, and queue links. `[backoffice-operations]`
- [ ] 22.4 Add loading/empty/error states and mobile card layout without dense desktop-only charts. `[backoffice-operations]`
- [ ] 22.5 Verify dashboard values against seeded database queries and the shared completion service. `[backoffice-operations]`

## 23. LGPD, security, abuse prevention, and observability

- [x] 23.1 Add approved-placeholder Terms/Privacy pages and a launch-blocking marker until client/legal content, support contact, and consent wording are supplied. `[audit-compliance]`
- [ ] 23.2 Document and test the manual data-subject correction/export/deletion-anonymization workflow without inventing an automatic retention interval. `[audit-compliance]`
- [ ] 23.3 Add security headers/CSP/frame/referrer/permissions configuration compatible with Supabase, Google OAuth, Vercel, and required media. `[platform-delivery]`
- [ ] 23.4 Add CSRF/same-origin verification where framework protections are insufficient and test direct action/route calls. `[identity-access] [platform-delivery]`
- [ ] 23.5 Add bounded rate limits for sign-up/recovery, CNPJ lookup, contact actions, and sensitive admin commands using a free-tier-compatible strategy. `[identity-access] [platform-delivery]`
- [ ] 23.6 Add safe request IDs and structured redacted logs for auth, authorization, moderation, bans, CNPJ health, email failures, migrations, and health endpoints. `[audit-compliance] [platform-delivery]`
- [ ] 23.7 Add tests that scan logs/audit DTOs for email, WhatsApp, CNPJ, tokens, signed URLs, SMTP secrets, and raw provider payload leakage. `[audit-compliance]`
- [ ] 23.8 Add liveness/readiness health handlers that reveal no secret/configuration details. `[platform-delivery]`
- [ ] 23.9 Threat-model Auth/session, IDOR, RLS context, Storage paths, admin escalation, banned recreation, CNPJ abuse, SMTP/outbox, and public data exposure; convert findings into tests. `[platform-delivery]`

## 24. Global responsive, accessibility, and performance hardening

- [ ] 24.1 Audit every public/auth/onboarding/status/catalog/profile/backoffice route at 320, 390, 768, and 1440 px for overflow, hierarchy, touch targets, dialogs, tables, and fixed elements. `[platform-delivery]`
- [ ] 24.2 Audit keyboard-only navigation, focus order/return, skip links, modal focus traps, error focus, and async announcements for every critical journey. `[platform-delivery]`
- [ ] 24.3 Audit WCAG 2.2 AA contrast, semantics, labels, descriptions, alt text, reduced motion, and zoom/reflow. `[platform-delivery]`
- [ ] 24.4 Optimize fonts, images, signed-media sizing, Server/Client component boundaries, TanStack Query hydration, Axios request waterfalls, Zustand subscription breadth, streaming, and bundle size. `[platform-delivery]`
- [ ] 24.5 Measure representative Core Web Vitals/Lighthouse behavior, document budgets, and fix regressions before release. `[platform-delivery]`
- [ ] 24.6 Run critical flows on Chromium and WebKit mobile/desktop and resolve browser-specific defects. `[platform-delivery]`
- [ ] 24.7 Proofread all UI/email/legal-placeholder copy for correct Brazilian Portuguese and ensure no internal English enum leaks into user text. `[platform-delivery]`

## 25. Continuous integration and environment promotion

- [ ] 25.1 Add CI caching and jobs for install/lockfile, format, lint, type-check, unit/component tests, dependency audit, and production build. `[platform-delivery]`
- [ ] 25.2 Add Docker/local Supabase CI job for clean reset, seed, schema/RLS/trigger/Storage/Auth-hook integration tests. `[platform-delivery]`
- [ ] 25.3 Add Playwright/axe CI smoke with artifacts on failure and no real external recipients/providers. `[platform-delivery]`
- [ ] 25.4 Add migration lint/dry-run/drift checks and forbid changed applied migration history. `[platform-delivery]`
- [ ] 25.5 Document/provision client-owned Supabase and Vercel projects named exactly `contente-creators-dev` and `contente-creators-prd`. `[platform-delivery]`
- [ ] 25.6 Configure isolated environment variables, URLs, Auth redirects, Google OAuth clients/callbacks, Storage policies, SMTP senders, and scheduled secrets for development. `[platform-delivery]`
- [ ] 25.7 Configure the equivalent isolated production resources without copying development data/secrets. `[platform-delivery]`
- [ ] 25.8 Implement controlled `develop` → development and protected `main` → production migration/deployment workflows with approval before production. `[platform-delivery]`
- [ ] 25.9 Add pre/post-deploy verification for schema version, Auth, Storage, CNPJ fallback, SMTP, protected catalog, backoffice, and health. `[platform-delivery]`
- [ ] 25.10 Document expand/contract migrations, application rollback, corrective roll-forward, failed-migration stop procedure, and immutable migration history. `[platform-delivery]`

## 26. End-to-end acceptance journeys

- [ ] 26.1 Write E2E for public landing → influencer intent → one combined email/creator registration request → confirmation → pending analysis fallback, with no second role-selection step. `[marketing-site] [identity-access] [onboarding-profiles]`
- [ ] 26.2 Write E2E for Google callback substitute → blocking company-role modal → successful CNPJ autofill → editable company onboarding → pending fallback. `[identity-access] [onboarding-profiles]`
- [ ] 26.3 Write E2E for BrasilAPI timeout/unavailable → manual company completion → successful submission. `[onboarding-profiles]`
- [ ] 26.4 Write E2E for admin queue → full review → changes request with reason → user correction/resubmission → approval → email outbox. `[moderation-lifecycle] [backoffice-operations]`
- [ ] 26.5 Write E2E proving pending/changes-requested/suspended/banned direct catalog requests receive no listing/detail data. `[moderation-lifecycle] [private-catalog]`
- [ ] 26.6 Write E2E for approved company search/filter/detail/contact and contact-consent denial. `[private-catalog]`
- [ ] 26.7 Write E2E for approved influencer other-creator catalog, self-exclusion, company-logo carousel, and private-contact omission. `[private-catalog]`
- [ ] 26.8 Write E2E for approved profile immediate edit, visible update, unchanged approval, and audit revision. `[onboarding-profiles] [audit-compliance]`
- [ ] 26.9 Write E2E for suspend/restore and ban, immediate listing removal, session/access changes, known-identity recreation denial, and exceptional audited unban. `[moderation-lifecycle] [identity-access]`
- [ ] 26.10 Write E2E for sponsorship create/schedule/reorder/render/expire and referenced-profile suppression without any payment flow. `[sponsorship-placements]`
- [ ] 26.11 Write E2E for multi-admin access, revoked-admin denial, account archive, audit filters, dashboard metrics, and failed-email retry. `[backoffice-operations]`
- [ ] 26.12 Write E2E/data inspection proving no public route/metadata/creative exposes participant listing data while social proof is disabled. `[marketing-site]`

## 27. Operational documentation and production readiness

- [ ] 27.1 Rewrite the project README with architecture, commands, TDD workflow, local services, environment matrix, migrations, and troubleshooting. `[platform-delivery]`
- [ ] 27.2 Add a data dictionary/state-machine/RLS matrix covering every table, role, status, sensitive field, and audit policy. `[identity-access] [audit-compliance]`
- [ ] 27.3 Add backoffice operating guide for moderation, correction wording, approval, suspension, ban/unban, archive, sponsorships, email retry, and audit review. `[backoffice-operations]`
- [ ] 27.4 Add an environment provisioning checklist for client-owned Supabase/Vercel/Google/SMTP/DNS accounts and exact dev/prd names. `[platform-delivery]`
- [ ] 27.5 Add backup/export/restore verification and free-tier capacity/upgrade trigger runbooks without claiming unavailable guarantees. `[platform-delivery]`
- [ ] 27.6 Add incident response for auth compromise, privacy exposure, wrong moderation, SMTP outage, provider outage, blocked migration, and Storage leak. `[platform-delivery]`
- [ ] 27.7 Obtain/record final brand assets, marketing copy, niche/employee-range seeds, initial admins, sponsorship creatives, domain, legal documents, support contact, consent wording, and audit retention from the client. `[marketing-site] [audit-compliance]`
- [ ] 27.8 Verify Google consent-screen branding, production callback/domain, SMTP sender identity, SPF/DKIM/DMARC, rate limits, and deliverability. `[identity-access] [transactional-communications]`
- [ ] 27.9 Execute development UAT across both roles and backoffice, record defects against spec scenarios, and close release blockers. `[platform-delivery]`
- [ ] 27.10 Execute production dry run, approved migration/deploy, synthetic smoke, privacy/log inspection, and launch monitoring. `[platform-delivery]`

## 28. Explicit Beta scope guard

- [ ] 28.1 Review schema, UI, routes, dependencies, and copy to confirm no payments, commissions, split, escrow, pricing ledger, checkout, or invoicing were introduced. `[sponsorship-placements]`
- [ ] 28.2 Confirm no internal chat/messages, proposals/campaigns, content delivery, digital contracts, agency accounts, ratings/reputation, or native app work was introduced. `[platform-delivery]`
- [ ] 28.3 Confirm CNPJ lookup is labeled form assistance and no automatic antifraud/verification assertion or automated approval exists. `[onboarding-profiles] [moderation-lifecycle]`
- [ ] 28.4 Confirm the removed DOCX five-star default and Instagram login do not exist in schema, UI, copy, tests, or seeds. `[identity-access] [platform-delivery]`
- [ ] 28.5 Confirm public creator/company profile and logo listings remain absent and protected by tests/configuration. `[marketing-site]`
- [ ] 28.6 Confirm slice folder responsibilities and dependency directions are respected: no empty speculative folders, catch-all `service/types/helpers` files, mixed runtime barrels, feature-business Context proliferation, TanStack Query data mirrored into Zustand, RSC store access, or duplicate Server Action/Route Handler command transports. `[platform-delivery]`

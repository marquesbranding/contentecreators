# Beta scope audit

Audit date: 2026-07-30. Scope baseline:
`openspec/changes/mvp-contente-creators/{proposal,design,specs,tasks}` and
`PRD - desenvolvimento.md`.

This review covers committed application schema, routes, UI/copy,
dependencies, tests, and slice boundaries. A future change that introduces a
guarded capability must repeat this audit before release.

## 1. Financial capabilities

**Result: pass.** There is no payment provider dependency, checkout/payment
route, financial table/enum, invoice, price ledger, commission, split, escrow,
or renewal workflow. Sponsorships are manually ordered/scheduled promotional
placements only.

Automated evidence:

- `src/features/sponsorships/schemas/sponsorship-placement.schema.unit.test.ts`
  rejects financial fields at the schema/type boundary.
- `src/features/sponsorships/components/sponsorship-placements.component.test.tsx`
  verifies pricing/payment copy and controls are absent.
- `package.json` contains no payment SDK.

## 2. Other deferred product capabilities

**Result: pass.** The schema, route tree, slices, and dependencies contain no
internal chat/message product, proposal/campaign workflow, content delivery,
digital contract, agency role/profile, rating/reputation system, or native
mobile application. Transactional e-mail “messages” and moderation “reasons”
are operational records, not internal chat.

The only application roles are `ADMIN`, `INFLUENCER`, and `COMPANY`; creator
subtypes are `INFLUENCER` and `UGC`.

## 3. CNPJ assistance and manual moderation

**Result: pass.** CNPJ lookup validates the checksum, calls BrasilAPI through a
bounded server adapter, proposes editable public fields, and falls back to
manual entry. UI copy calls it a consultation/autocomplete and the review DTO
includes the assistance disclaimer.

No provider result changes account status. Approval remains an explicit
administrator transition from `PENDING_REVIEW`; no automatic antifraud,
verification assertion, or automated approval exists.

Evidence includes:

- `src/features/onboarding/components/cnpj-lookup-feedback.tsx`;
- `src/features/onboarding/server/route-handlers/cnpj-lookup-route-handler.unit.test.ts`;
- `src/features/onboarding/server/services/brasil-api-cnpj.service.unit.test.ts`;
- `src/features/moderation/domain/moderation-policy.unit.test.ts`.

## 4. Removed DOCX defaults and Auth providers

**Result: pass.** No five-star default/rating exists in schema, seeds, routes,
or UI. Instagram is available only as a social-profile platform. Supabase
OAuth is invoked with the literal provider `google`; email/password is the
other login method.

Evidence:

- `src/db/schema/enums.ts` has identity providers `EMAIL` and `GOOGLE`;
- `src/features/identity/server/services/supabase-auth.gateway.ts` calls
  `signInWithOAuth({ provider: "google" })`;
- social platform `INSTAGRAM` is profile presentation data and has no Auth
  transport.

## 5. Public listings and social proof

**Result: pass.** The root landing is a build-prerendered static shell.
Optional enhancements accept only privacy-safe aggregates/generic promotions,
fail closed, and never serialize participant listings, links, or logos.
`publicSocialProofEnabled` and
`PUBLIC_SOCIAL_PROOF_ENABLED` are immutable `false` constants, with no
backoffice toggle.

Evidence:

- `src/app/page.route.test.ts`;
- `src/features/marketing/server/public-social-proof.unit.test.ts`;
- `src/features/marketing/server/services/public-aggregate-counters.service.unit.test.ts`;
- `src/features/marketing/components/marketing-landing.component.test.tsx`;
- `src/features/sponsorships/server/queries/public-sponsorship-promotion.query.unit.test.ts`;
- `src/features/sponsorships/domain/sponsorship-placement-policy.unit.test.ts`.

## 6. Slice and state ownership

**Result: pass.** The committed tree has behavior-oriented vertical slices,
explicit browser/server entry points, and no tracked empty speculative
directory. There are no catch-all `service.ts`, `services.ts`, `helpers.ts`,
`types.ts`, or `common.ts` production files.

The ESLint boundary configuration enforces:

- `app` composes feature/shared APIs and does not access `db`;
- client graphs cannot import server/DB modules;
- feature imports follow the reviewed slice dependency direction;
- `shared`/`db` cannot import business features;
- production cannot import test files.

TanStack Query owns remote catalog, queue, analytics, audit, outbox, CNPJ, and
sponsorship query data. The only Zustand store contains
`activeDialog`/`mobileNavigationOpen` UI state and is created per provider; it
contains no Auth, role, profile, form, URL, or remote entity. Server Components
do not access that store.

Reads use Route Handlers where browser queries need HTTP/cancellation.
Mutations choose one transport per command: Server Actions for form/moderation
commands or Route Handlers for the sponsorship-management API. There is no
duplicate public command transport for the same use case.

Architecture evidence:

- `eslint.config.mjs`;
- `docs/architecture/slices.md`;
- `docs/architecture/state-ownership.md`;
- `src/shared/store/app-store.ts`;
- `src/shared/store/app-store-provider.tsx`.

## Reproduction checklist

Run before release:

```bash
npm run lint
npm run type-check
npm run test
npm run build
```

Then review new dependencies, migrations, app routes, feature folders, Auth
provider literals, public DTOs, and sponsorship contracts against the six
sections above. Search results must be interpreted: terms such as “message”
inside the SMTP outbox or “split” in string parsing are not product
capabilities.

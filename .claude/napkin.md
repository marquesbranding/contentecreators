# Napkin Runbook

## Curation Rules

- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

## Execution & Validation (Highest Priority)

1. **[2026-07-22] Treat this repository's Next.js as version-specific**
   Do instead: read the relevant guide under `node_modules/next/dist/docs/` before writing Next.js code and heed local deprecations.

2. **[2026-07-23] Run Playwright against the production Next.js server**
   Do instead: keep the E2E web server on `next build` + `next start`; parallel WebKit against Turbopack dev/HMR can emit transient chunk-load errors even when assertions pass.

3. **[2026-07-23] Keep synthetic UUIDs RFC-valid**
   Do instead: use a valid UUID version nibble and variant (for example `...-4000-8000-...`) because PostgreSQL accepts looser UUID strings that strict Zod validation correctly rejects. The deliberate exception is GoTrue's required local `auth.users.instance_id`, which is the nil UUID.

4. **[2026-07-23] Preserve the complete Supabase SSR refresh response**
   Do instead: in Next.js 16 `src/proxy.ts`, copy every refreshed cookie and the current `setAll` response headers onto redirects; keep Proxy limited to refresh plus optimistic routing and repeat authorization in the server DAL/action.

5. **[2026-07-23] Restart Turbopack after adding browser runtime dependencies**
   Do instead: restart `next dev` after installing packages such as `motion`; an already-running dev process can serve updated markup with a stale client bundle and leave entrance animation elements in their hidden initial state.

6. **[2026-07-23] Keep Base UI value state controlled for the component lifetime**
   Do instead: initialize selection controls with `null`, never `undefined`, and remount mutually exclusive role-specific form subtrees with a stable role key so inputs do not switch between controlled and uncontrolled modes.

7. **[2026-07-24] Publish each completed implementation wave**
   Do instead: after the relevant validations pass, commit the finished scoped changes and push the current branch without waiting for a separate reminder.

8. **[2026-07-24] Serialize local integration test files that share Supabase**
   Do instead: keep the Vitest integration project on `fileParallelism: false` with Docker-tolerant test/hook timeouts, isolate or archive synthetic records in teardown, and never launch multiple reset-enabled Vitest processes. After one deterministic reset, use `SKIP_LOCAL_STACK_RESET=true` for targeted reruns; concurrent Docker prune/reset operations can tear down the shared stack.

9. **[2026-07-24] Treat Supabase Auth moderation as a post-commit effect**
   Do instead: commit account status, blocked identities, audit, outbox, and a retryable Auth-effect record atomically; then call `updateUserById` for ban/unban. Admin `signOut` requires the target JWT, so enforce immediate denial through database status/RLS and let the existing banned-session defense revoke a presented token.

10. **[2026-07-28] Keep paginated list and count queries structurally equivalent**
    Do instead: when search predicates reference joined profile tables, repeat the same joins in the total-count query and prove the filtered total against local PostgreSQL; mocked repository tests do not compile the generated SQL.

## Product Requirements

1. **[2026-07-22] Product prompt overrides the roadmap DOCX**
   Do instead: resolve requirement conflicts in order: current user prompt, then `Contente Creators Beta - Roadmap.docx`; ask before inventing behavior absent from both.

2. **[2026-07-23] Organize the frontend as vertical slices with explicit client-state ownership**
   Do instead: keep domain code inside feature slices with explicit folder contracts and runtime-safe public APIs; create only the folders a slice needs, isolate reusable client orchestration in custom hooks, reserve server services for application use cases, use Axios + TanStack Query for remote interactive state, and use Zustand only for truly global client state instead of proliferating providers.

3. **[2026-07-23] Build authenticated and backoffice surfaces on shadcn/ui**
   Do instead: compose shadcn/ui primitives heavily for forms, dialogs, sheets, menus, tables, tabs, filters, pagination, skeletons, alerts, toasts, and empty states; centralize visual variants and keep domain behavior in slice hooks, services, and stores.

4. **[2026-07-22] Keep source code in English and product copy in Brazilian Portuguese**
   Do instead: use English identifiers, paths, schemas, tests, and comments while writing polished, correctly accented `pt-BR` interface text.

5. **[2026-07-22] Keep the MVP free-tier-first and mobile-first**
   Do instead: plan Supabase Auth/Postgres/Storage, Vercel deployment, responsive mobile-first UI, and TDD unless the user explicitly changes the stack.

6. **[2026-07-22] Do not expose profiles or company logos on the public landing page yet**
   Do instead: keep catalog records private to approved authenticated accounts until the client validates public social proof.

7. **[2026-07-25] Preserve the complete official logo set and use consistent interface iconography**
   Do instead: keep every PNG under `public/brand/official` byte-identical, select white/pink/blue/lime/royal-blue/black through the shared `BrandLogo`, never recolor the artwork, use Lucide icons for UI symbols, and avoid emoji.

8. **[2026-07-23] Make required-field behavior consistent and accessible**
   Do instead: use the shared red required indicator and form notice, preserve native `required` semantics, validate custom shadcn/Base UI controls through `useRequiredFieldValidation`, show adjacent `pt-BR` errors with `aria-invalid`, and focus the first invalid field before dispatching a Server Action.

9. **[2026-07-28] Keep operational telemetry metadata-only**
   Do instead: use the central safe request-ID and operational logger primitives; log only bounded categories/durations and scan outputs for email, phone, CNPJ, tokens, signed URLs, SMTP secrets, and provider payloads.

## Shell & Command Reliability

1. **[2026-07-22] Preserve user work in the shared repository**
   Do instead: inspect status before edits, use `apply_patch`, and avoid touching unrelated dirty files.

2. **[2026-07-23] Rebuild the local Supabase stack for deterministic resets**
   Do instead: use local-only `supabase stop --no-backup` followed by `supabase start`; the CLI's in-place `db reset` can restart Storage at a new Docker IP while Kong retains the prior upstream and returns 502.

3. **[2026-07-23] Remember that PostgreSQL `now()` is transaction-stable**
   Do instead: do not expect `updated_at` to differ between two writes in one transaction; use changed business/version fields for those assertions.

4. **[2026-07-28] Avoid the Apple Git shim while the Xcode license is pending**
   Do instead: use the bundled fallback Git at `/Users/feanorzin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/git`; `/usr/bin/git` currently exits before repository operations with the Xcode license prompt.

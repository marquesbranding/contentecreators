# Test-first delivery workflow

Every business behavior follows red, green, refactor:

1. Add the smallest failing scenario that expresses the user-visible or security outcome.
2. Confirm the new test fails for the intended reason.
3. Implement the minimum behavior that makes it pass.
4. Add denial, boundary, loading/error, and accessibility scenarios proportional to the risk.
5. Refactor while the focused project and affected integration/E2E paths stay green.

## Pull request evidence

- [ ] The first commit or review evidence contains the failing scenario.
- [ ] Success and relevant authorization/ownership/status denial paths are explicit.
- [ ] Mutations verify audit and idempotency when required.
- [ ] Client remote state verifies cancellation, retry, invalidation, and authorization loss when applicable.
- [ ] Mobile, keyboard, screen-reader, loading, empty, and error states are covered for changed UI.
- [ ] Synthetic fixtures contain no production personal data.
- [ ] The implementation does not bypass a slice public API or duplicate a command transport.
- [ ] Focused tests, full Vitest suite, type-check, lint, production build, and affected Playwright projects pass.

## Test projects

- `unit`: pure domain rules, schemas, formatters, policies, mappers, and safe utilities in Node.
- `component`: React components and custom hooks in jsdom with Testing Library, user-event, and accessibility helpers.
- `integration`: Supabase/Postgres/Storage/Auth hooks, migrations, RLS, audit triggers, outbox, and adapters against isolated local services.
- `e2e`: critical browser journeys on mobile/desktop Chromium and WebKit with Playwright and axe.

## Coverage gate

The V8 baseline is 80% for statements, lines, and functions and 75% for branches across feature logic and shared application infrastructure. Coverage never replaces explicit tests for:

- every moderation transition and forbidden transition;
- every role/status/ownership authorization branch;
- banned-identity recreation defenses;
- RLS and Storage cross-account isolation;
- audit redaction and append-only behavior;
- outbox idempotency/retry;
- catalog data denial for non-approved accounts.

The untouched starter passed the configured component project and `next build` on 2026-07-23 before product implementation began.

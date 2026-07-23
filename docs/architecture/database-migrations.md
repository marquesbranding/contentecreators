# Database migration ownership

Timestamped SQL under `supabase/migrations/` is the only deployable schema
source of truth. It owns tables, extensions, functions, triggers, RLS, Storage,
and Auth integration.

The modular declarations under `src/db/schema/` mirror that SQL for runtime
typing, relations, and query construction. Every database change must update
both representations in the same pull request and pass the local drift-focused
integration test.

## Allowed workflow

1. Add or amend an unapplied local timestamped Supabase migration.
2. Update the matching Drizzle schema modules.
3. Run `npm run local:reset` and `npm run test:integration:local`.
4. Review the SQL and query plans before deploying it.
5. Apply migrations through the Supabase migration workflow.

`drizzle-kit push` is forbidden in local, shared development, and production
environments. It bypasses the reviewed Supabase migration history and cannot
fully own Auth, Storage, RLS, or audit-trigger changes. `drizzle-kit generate`
may only be used to create disposable review output; generated SQL must be
reviewed and incorporated into a Supabase migration rather than deployed
directly. The committed Drizzle config deliberately contains no database
credentials, so a default `drizzle-kit push` has no target and fails safely.

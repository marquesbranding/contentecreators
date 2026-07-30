# Migration and deployment runbook

The repository promotes one reviewed commit and the same immutable Supabase
migrations through isolated projects:

```text
develop -> contente-creators-dev
main --Vercel production build--> contente-creators-prd
```

The deployment entry points are:

- `.github/workflows/deploy-development.yml`: automatic on `develop`, with a
  manual development rerun available only from that branch;
- `vercel.json` + `npm run vercel:build`: automatic production deployment from
  `main` in the Vercel project `contente-creators-prd`, without GitHub
  deployment secrets.

Branch protection must require both `CI` and `Database CI`. The deployment
checks remain responsible for format, lint, types, tests, and immutable
migration history before changes reach `main`. Vercel refuses hosted database
mutations unless its system environment identifies a production build from
that exact branch.

## Promotion sequence

The production Vercel build runs these steps in order:

1. Resolve the database and service-role aliases installed by the
   Vercel/Supabase integration.
2. Fail closed unless `VERCEL=1`, `VERCEL_ENV=production`,
   `VERCEL_GIT_COMMIT_REF=main`, and `APP_ENV=production`.
3. Derive the Supabase project reference from the HTTPS API origin and verify
   both database URLs belong to that same project.
4. Run `next build` before any hosted mutation.
5. Run `supabase db push --db-url <DIRECT_URL> --dry-run` without linking a
   Supabase account or requiring a management access token.
6. Apply only pending committed migrations through that same direct/session
   connection.
7. Compare the complete ordered hosted migration ledger with the committed
   migration directory.
8. Idempotently invite or promote `thomas@marquesbranding.com` as the first
   approved production `ADMIN`, with a system audit revision.
9. Return the completed Next.js artifact to Vercel for publication.

Preview and local executions of `npm run vercel:build` run only `next build`.
They never receive a production migration plan.

No seed is applied to hosted projects by the deployment workflow. Production
data is never copied into development.

## Pre-deploy verification

`npm run deploy:verify -- --phase=pre --target=<development|production>`
validates:

- exact project-name and `APP_ENV` isolation;
- Supabase project-reference/API-origin and Vercel project/org linkage;
- HTTPS application and Supabase origins without embedded credentials;
- `PUBLIC_SOCIAL_PROOF_ENABLED=false`;
- Supabase Auth health;
- Supabase Storage health.

The CLI prints only check categories and status. It never prints environment
values, tokens, connection strings, provider bodies, personal data, or SMTP
responses.

## Post-deploy verification

`npm run deploy:verify -- --phase=post --target=<target> --base-url=<url>`
fails the deployment when any required check fails:

| Check                 | Acceptance                                                                      |
| --------------------- | ------------------------------------------------------------------------------- |
| Migration ledger      | Complete ordered hosted version/name ledger equals every committed migration    |
| Storage/RLS           | Required buckets exist and are private; representative business tables have RLS |
| Synthetic Storage     | Positive owner read when both optional synthetic credentials are configured     |
| Auth                  | `/auth/v1/health` reports `ok`                                                  |
| Storage               | `/storage/v1/status` reports `ok`                                               |
| SMTP                  | Transport connection/authentication verifies without a recipient or message     |
| Application liveness  | `/api/health/live` reports `ok`                                                 |
| Application readiness | `/api/health/ready` reaches the target database and reports `ready`             |
| CNPJ fallback seam    | Invalid local input is rejected as `invalid` without contacting BrasilAPI       |
| Catalog denial        | Anonymous catalog API receives `401` or `403` and no listing DTO                |
| Backoffice denial     | Anonymous backoffice API receives `401` or `403` and no admin DTO               |

The CNPJ smoke deliberately avoids a real provider request. Contract tests own
provider timeout/unavailable behavior; the deployed smoke proves the local
validation/manual-fallback boundary remains available without consuming a real
CNPJ or depending on BrasilAPI.

## Expand/contract migration policy

Every deployed schema change follows an additive, backward-compatible sequence:

1. **Expand:** add nullable/defaulted columns, new tables, indexes, functions,
   policies, or dual-read capability without removing what the current
   application needs.
2. Deploy application code that can read the old and expanded shape and writes
   the new shape safely.
3. Backfill through an explicit bounded, observable operation when required.
4. Verify reads, writes, RLS, audit triggers, and operational metrics.
5. **Contract:** in a later reviewed migration, remove old reads/writes and only
   then remove obsolete schema after rollback compatibility is no longer
   required.

Do not combine an incompatible drop/rename and the only compatible application
deployment in one release.

## Application rollback

If the application deployment or smoke fails after an additive migration:

1. Stop promotion. Do not rerun migrations blindly.
2. Preserve the GitHub run, Vercel deployment URL, commit SHA, migration list,
   timestamps, and redacted error category.
3. Confirm the last known-good application is compatible with the expanded
   schema.
4. Create and review a revert commit on `main` that restores the known-good
   application code while preserving compatible migrations, then let Vercel
   build that new tip. A Vercel dashboard rollback
   is allowed only when the operator records the deployment and compatibility
   evidence.
5. Re-run every post-deploy check.

Application rollback does not delete or rewrite a migration.

## Failed migration stop procedure

If dry-run, link, database connection, or migration application fails:

1. Let the Vercel build fail before publication. A Next.js artifact may already
   exist inside the isolated build VM, but Vercel must not publish it after a
   failed migration.
2. Do not use `migration repair`, dashboard SQL, or direct DDL as an immediate
   workaround.
3. Determine whether the migration committed no change, committed fully, or
   partially changed non-transactional objects.
4. Compare the remote migration ledger with the committed directory using
   read-only commands.
5. Keep the current application serving if it remains compatible.
6. Create a new corrective migration locally, reset the clean local stack, run
   `Database CI`, deploy to development, and obtain review before production.
7. Resume production only with an approved new commit and a new manual run.

Escalate when the database state cannot be classified safely. Do not guess.

## Corrective roll-forward

Production database recovery prefers a new immutable migration because it
preserves an auditable sequence and avoids hiding already observed schema
states. The corrective migration must:

- have a later unique timestamp;
- be safe when the prior migration is fully or partially present;
- restore application compatibility before attempting cleanup;
- update the Drizzle mirror in the same pull request;
- pass a clean local reset, migration/drift checks, integration tests,
  development deployment, and post-deploy smoke.

Destructive correction requires verified export/backup evidence and a separate
reviewed plan.

## Immutable migration history

After a migration is applied to either hosted project:

- never edit, rename, reorder, delete, or replace its SQL file;
- never use `drizzle-kit push` or undocumented dashboard DDL;
- never copy a development migration ledger into production;
- add a later migration for every correction;
- require CI to reject changed applied migration files and drift;
- keep SQL migrations and the Drizzle runtime schema synchronized.

The migration ledger, Vercel deployment, commit SHA, publishing operator, and
smoke result form the release evidence. Evidence must remain metadata-only and
must not contain credentials or participant data.

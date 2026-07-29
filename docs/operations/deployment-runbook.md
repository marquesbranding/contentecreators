# Migration and deployment runbook

The repository promotes one reviewed commit and the same immutable Supabase
migrations through isolated projects:

```text
develop -> contente-creators-dev
main --manual approval--> contente-creators-prd
```

The workflows are:

- `.github/workflows/deploy-development.yml`: automatic on `develop`, with a
  manual development rerun available only from that branch;
- `.github/workflows/deploy-production.yml`: manual from `main`, requiring the
  exact current main SHA, explicit confirmation, and approval through the
  GitHub Environment `contente-creators-prd`.

Branch protection must require both `CI` and `Database CI`. The deployment
workflows repeat a bounded code preflight so a later rerun cannot bypass basic
format, lint, type, unit, or component gates. That preflight also compares the
promoted commit with its trusted predecessor and fails closed if an existing
migration was edited, renamed, copied, or removed.

## Promotion sequence

Each environment-bound deployment job runs these steps in order:

1. Pull the exact target Vercel project settings and encrypted environment.
2. Fail closed if `APP_ENV`, project names, HTTPS origins, or the Beta privacy
   guard do not match the target.
3. Verify the Supabase Management API name/reference, database connection
   identities, Vercel project ID/name, Auth, and Storage without printing
   credentials.
4. Link the exact Supabase project reference from the GitHub Environment.
5. Run `supabase db push --dry-run` against that linked project.
6. Build the application with `vercel build --prod` before mutating the hosted
   database.
7. Apply only pending committed migrations and inspect remote migration history.
8. Upload only `.vercel/output` with `vercel deploy --prebuilt --prod`.
9. Run the post-deploy checks. Any failure leaves the workflow failed and blocks
   further promotion.

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
   application code while preserving compatible migrations, then promote that
   new tip through the same production workflow. A Vercel dashboard rollback
   is allowed only when the operator records the deployment and compatibility
   evidence.
5. Re-run every post-deploy check.

Application rollback does not delete or rewrite a migration.

## Failed migration stop procedure

If dry-run, link, database connection, or migration application fails:

1. Stop the workflow before deployment. A prebuilt artifact may already exist,
   but it must not be promoted after a failed migration.
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

The migration ledger, workflow run, commit SHA, approving operator, and smoke
result form the release evidence. Evidence must remain metadata-only and must
not contain credentials or participant data.

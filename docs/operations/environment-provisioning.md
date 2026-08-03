# Hosted environment provisioning

This checklist is the operator gate for the client-owned hosted resources. It
does not claim that any remote account, project, secret, DNS record, OAuth
client, or SMTP sender has already been created.

## Required isolated resources

| Concern                | Development                                   | Production                                |
| ---------------------- | --------------------------------------------- | ----------------------------------------- |
| Vercel project         | `contente-creators-dev`                       | `contente-creators-prd`                   |
| Supabase project       | `contente-creators-dev`                       | `contente-creators-prd`                   |
| Deployment executor    | Environment-bound development workflow        | Vercel production build from `main`       |
| Application data       | Disposable synthetic QA data only             | Client production data only               |
| Google OAuth           | Dedicated non-production client               | Dedicated production client               |
| Marques Branding SMTP  | Dedicated non-production sender/configuration | Dedicated production sender/configuration |
| Public application URL | Isolated development domain                   | `https://contentecreators.com`            |

The current final production origin is `https://www.contentecreators.com`;
Vercel redirects `https://contentecreators.com` to it. Use the final origin for
`NEXT_PUBLIC_APP_URL`, Supabase Auth Site URL, and exact application callbacks.

Both Vercel projects deploy their own Vercel `production` target. The projects
remain separate; production is never implemented as another environment inside
`contente-creators-dev`.

## Client-owned provisioning gates

Complete these items in the client accounts and record evidence outside the
repository. Do not paste values, screenshots containing values, or CLI output
containing values into issues or logs.

### Resource ownership

- [ ] The client owns both Vercel projects with the exact names above.
- [ ] The client owns both Supabase projects with the exact names above.
- [ ] The two Supabase project references, databases, Auth users, Storage
      objects, service-role keys, and API keys are distinct.
- [ ] The two Vercel project IDs and encrypted environment-variable sets are
      distinct.
- [ ] Production data or credentials have never been copied into development.
- [ ] The initial administrators are separately approved for each stage.

### Repository and deployment controls

- [ ] Vercel production branch is exactly `main`.
- [ ] `vercel.json` keeps production Git deployments enabled only for `main`.
- [ ] Vercel's **Automatically expose System Environment Variables** option is
      enabled so the build can fail closed on `VERCEL_ENV` and
      `VERCEL_GIT_COMMIT_REF`.
- [ ] `develop` branch protection requires the `CI` and `Database CI` checks.
- [ ] `main` branch protection requires the `CI` and `Database CI` checks,
      review, and no direct unreviewed pushes.
- [ ] The Vercel project has the Supabase integration variables scoped to
      Production and does not expose production values to Preview or
      Development.

Production does not require GitHub Environment secrets. `scripts/vercel-build.ts`
uses the direct/session URL already installed in Vercel and never prints that
URL. Supabase migrations remain ledger-based and the initial administrator
bootstrap remains idempotent.

## Vercel application configuration

Configure every application variable in the target Vercel project. Values must
not cross environments.

| Variable                                | Development                                 | Production                               |
| --------------------------------------- | ------------------------------------------- | ---------------------------------------- |
| `APP_ENV`                               | `development`                               | `production`                             |
| `NEXT_PUBLIC_APP_URL`                   | Exact development origin                    | `https://www.contentecreators.com`       |
| `NEXT_PUBLIC_SUPABASE_URL`              | Development Supabase API URL                | Production Supabase API URL              |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`  | Development publishable key                 | Production publishable key               |
| `DATABASE_URL`                          | Development Supavisor transaction pooler    | Production Supavisor transaction pooler  |
| `DIRECT_URL`                            | Development direct/session connection       | Production direct/session connection     |
| `SUPABASE_SERVICE_ROLE_KEY`             | Development only                            | Production only                          |
| `PRODUCTION_ADMIN_INITIAL_PASSWORD`     | Not configured                              | One-time approved admin initial password |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | Non-production Marques endpoint             | Production Marques endpoint              |
| `SMTP_USER`, `SMTP_PASSWORD`            | Non-production credentials                  | Production credentials                   |
| `SMTP_FROM_NAME`, `SMTP_FROM_EMAIL`     | Approved non-production identity            | Approved production identity             |
| `CRON_SECRET`                           | Unique random value, at least 32 characters | Different unique value                   |
| `PUBLIC_SOCIAL_PROOF_ENABLED`           | `false`                                     | `false`                                  |
| `SUPPORT_CONTACT_EMAIL`                 | Client-approved non-production contact      | Client/legal-approved production contact |

The hosted runtime and deployment verifier also accept the variables installed
by the Vercel/Supabase integration. Canonical application names remain
preferred when both are configured:

| Canonical application name  | Hosted integration alias   |
| --------------------------- | -------------------------- |
| `DATABASE_URL`              | `POSTGRES_URL`             |
| `DIRECT_URL`                | `POSTGRES_URL_NON_POOLING` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY`      |

Do not reconstruct PostgreSQL URLs from the separate host, user, password, and
database variables. The integration URLs preserve the reviewed pooler, port,
TLS, and credential encoding configuration.

`PRODUCTION_ADMIN_INITIAL_PASSWORD` must exist only in the Vercel
**Production** scope. The deployment uses it to create or initialize the three
approved administrator identities. A private Supabase Auth metadata marker
prevents later deployments from resetting a password that was already seeded.
Do not add this secret to DEV, Preview, `.env.local`, GitHub, or the repository.

`NEXT_PUBLIC_*` values are frozen into the browser bundle during
`vercel build`; therefore the workflow pulls and builds against the target
project instead of promoting one prebuilt artifact across projects.

The complete distinction between variables installed by the Supabase/Vercel
integration, manually managed Vercel values, and Supabase Dashboard
configuration is documented in the
[integration guide](./vercel-supabase-integration.md). The production Google
OAuth values for `www.contentecreators.com` are listed in the
[Google OAuth release checklist](./google-oauth-release.md).

## Supabase Auth, Storage, and scheduled work

For each Supabase project:

- [ ] Set the exact application site URL and only the matching callback,
      recovery, and email-confirmation redirect origins.
- [ ] Configure a dedicated Google OAuth client and the matching
      `https://<project-ref>.supabase.co/auth/v1/callback`. Production uses
      `https://kstbhqeiebutpfvswyla.supabase.co/auth/v1/callback`.
- [ ] Configure Marques Branding SMTP and copy the reviewed `pt-BR` templates
      from `supabase/templates/`.
- [ ] Confirm sender ownership, SPF, DKIM, DMARC, provider limits, and
      non-production labeling where applicable.
- [ ] Apply committed migrations; do not create tables, policies, functions, or
      hooks through undocumented dashboard edits.
- [ ] Confirm `profile-media` and `sponsorship-media` are private and their
      committed Storage policies are active.
- [ ] Confirm the Before User Created hook uses only the matching database and
      that blocked identities are isolated by environment.

For each Vercel project:

- [ ] Confirm production automatic Git deployment is enabled only for the
      intended production branch; `contente-creators-prd` uses `main`.
- [ ] Confirm the Vercel Build Command resolves to `npm run vercel:build` from
      `vercel.json` and has no conflicting dashboard override.
- [ ] Confirm the `/api/cron/email-outbox` schedule from `vercel.json`.
- [ ] Confirm Vercel sends `Authorization: Bearer <CRON_SECRET>` and the
      endpoint rejects a missing or wrong signature.
- [ ] Confirm no scheduled development secret or endpoint exists in production,
      or the reverse.

## Optional synthetic Storage smoke

The post-deploy verifier always checks that both required buckets are private
and that representative application tables have RLS. A positive object read is
also executed when the environment provides both:

- `DEPLOY_SMOKE_STORAGE_OBJECT_PATH`: path to a non-personal synthetic object;
- `DEPLOY_SMOKE_USER_JWT`: short-lived token for its synthetic approved owner.

Never use a real participant object or long-lived user token. Configure both
values or neither; a partial configuration fails closed.

## Release gate

Tasks that require real hosted provisioning remain incomplete until every
applicable checkbox is independently verified in the client accounts. The
committed workflows and checklists do not substitute for that evidence.

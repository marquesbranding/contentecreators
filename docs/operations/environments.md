# Environment configuration

Contente Creators uses three isolated stages. Never copy production data, users, Storage objects, OAuth credentials, SMTP credentials, or service-role secrets into another stage.

| Stage       | Next.js                        | Supabase                         | Data and email                                                                     |
| ----------- | ------------------------------ | -------------------------------- | ---------------------------------------------------------------------------------- |
| Local       | `http://localhost:3000`        | Supabase CLI/Docker              | Synthetic seed, Supabase Auth inbox, local application SMTP catcher                |
| Development | Vercel `contente-creators-dev` | Supabase `contente-creators-dev` | Disposable QA data and isolated Marques Branding non-production SMTP configuration |
| Production  | Vercel `contente-creators-prd` | Supabase `contente-creators-prd` | Client production data and production Marques Branding SMTP configuration          |

## Rules

- Copy `.env.example` to `.env.local`; never commit `.env.local` or real credentials.
- Browser code receives only `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `DATABASE_URL`, `DIRECT_URL`, service-role, SMTP, and cron values are server-only.
- Runtime Drizzle uses `DATABASE_URL` through Supavisor transaction pooling. Migrations use `DIRECT_URL`.
- `APP_ENV` must be `local`, `development`, or `production`; it controls
  non-production email labeling and must match the target resources.
- Vercel and Supabase settings must be configured independently for development and production.
- `PUBLIC_SOCIAL_PROOF_ENABLED` is fixed to `false` for this Beta. A public listing requires a reviewed OpenSpec change, consent review, and new tests.
- Missing or invalid values fail with key names only; diagnostics never include supplied values.

## Local setup

1. Install the pinned Node/npm versions from `.nvmrc` and `package.json`.
2. Install Docker Desktop or another compatible Docker engine.
3. Copy `.env.example` to `.env.local`.
4. Run `npm run local:start`; this starts the pinned Mailpit application-email
   catcher and the Supabase CLI stack.
5. Replace the Supabase placeholders with values returned by
   `npm run db:status`.
6. Run `npm run local:reset`, `npm run test:integration:local`, `npm run test`,
   and `npm run dev`.

Useful local URLs:

| Service                           | URL / connection             |
| --------------------------------- | ---------------------------- |
| Application                       | `http://localhost:3000`      |
| Supabase Studio                   | `http://127.0.0.1:54323`     |
| Supabase Auth email inbox         | `http://127.0.0.1:54324`     |
| Application SMTP Mailpit inbox    | `http://127.0.0.1:8025`      |
| Application SMTP Mailpit endpoint | `smtp://127.0.0.1:1025`      |
| Local Postgres                    | `postgres://127.0.0.1:54322` |
| Local transaction pooler          | `postgres://127.0.0.1:54329` |
| Supabase API                      | `http://127.0.0.1:54321`     |

Auth emails stay in Supabase's local inbox. Application emails sent through the
Marques Branding SMTP adapter use Mailpit locally. This separation makes Auth
and business-notification tests independently observable.

The committed local Auth templates are under `supabase/templates/`. Hosted
Supabase projects require those templates to be copied through the dashboard
or Management API because they do not read the repository files directly.
Follow [the email delivery runbook](./email-delivery.md) for redirect isolation,
SMTP/DNS verification, and the local end-to-end acceptance flow.

Email confirmation is required locally. The allowlist contains exact
`localhost` and `127.0.0.1` callback/recovery URLs. Google Auth remains disabled
until local Google credentials are exported as
`SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and
`SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`; the Google console callback is
`http://127.0.0.1:54321/auth/v1/callback`.

Daily commands:

- `npm run local:start`: start application email plus Supabase.
- `npm run local:status`: print both stack statuses and local credentials.
- `npm run local:stop`: stop Supabase and remove the Mailpit container while
  preserving its named local volume.
- `npm run local:reset`: destructively remove and rebuild **only the local
  Supabase stack** from committed configuration, migrations, and
  `supabase/seed.sql`.
- `npm run test:integration:local`: reset the local database, then verify
  Postgres (direct and pooled), Auth, Storage, both email inboxes, and the
  committed private buckets.

## Auth and OAuth callback contract

Configure each stage independently. Never reuse the development Google client
or Supabase project in production.

| Stage       | Supabase Auth application redirect allowlist                               | Google Console authorized redirect URI                             |
| ----------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Local       | `http://localhost:3000/auth/callback` and the exact `127.0.0.1` equivalent | `http://127.0.0.1:54321/auth/v1/callback`                          |
| Development | `https://<contente-creators-dev-domain>/auth/callback`                     | `https://<contente-creators-dev-ref>.supabase.co/auth/v1/callback` |
| Production  | `https://<contente-creators-prd-domain>/auth/callback`                     | `https://<contente-creators-prd-ref>.supabase.co/auth/v1/callback` |

For each Vercel project, `NEXT_PUBLIC_APP_URL` must be the exact application
origin represented in its Supabase allowlist. The application callback accepts
only internal destinations under `/app`, `/onboarding`, `/backoffice`, or
`/reset-password`; external and protocol-relative return paths fall back to
`/onboarding/role`. Production must use exact origins—no wildcard preview URLs.
The real development/production domains, Supabase project references, and
Google credentials remain client-owned launch configuration and must replace
the placeholders above before enabling each provider.

The reset script uses the CLI's local-only `stop --no-backup` plus `start`
sequence. Before running any Supabase command against hosted infrastructure,
verify the linked project reference and target stage explicitly.

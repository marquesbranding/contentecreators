# Administrator provisioning

Administrators use the shared Supabase Auth project, but public registration
never exposes the `ADMIN` role.

## Initial administrator

The bootstrap command uses the direct database connection and the server-only
Supabase Admin API. It is dry-run by default.

```bash
npm run admin:bootstrap -- \
  --email admin@example.com \
  --approval-reference CLIENTE-ADMIN-2026-01 \
  --confirm-supabase-url http://127.0.0.1:54321
```

Review the target URL and result. To apply the exact operation, repeat it with
`--execute`:

```bash
npm run admin:bootstrap -- \
  --email admin@example.com \
  --approval-reference CLIENTE-ADMIN-2026-01 \
  --confirm-supabase-url http://127.0.0.1:54321 \
  --execute
```

Guardrails:

- `--confirm-supabase-url` must exactly match the configured environment.
- The email and approval reference are mandatory and normalized/validated.
- The operation is serialized with a database advisory transaction lock.
- If another initial administrator already exists, a different identity is
  rejected.
- Repeating the same approved identity is idempotent and creates no duplicate
  account or audit revision.
- A missing Auth identity receives a Supabase invitation whose redirect belongs
  to the current application environment.
- The account grant is recorded with `SYSTEM` / `SCRIPT` audit attribution and
  the approval reference.

The service-role credential and direct connection string remain server-only.
Never paste command output containing local environment values into public
channels.

The production deployment workflow uses a separate, closed bootstrap after the
committed migrations and before promotion. Only this approved set is accepted:

| Email                        | Audit reference                    |
| ---------------------------- | ---------------------------------- |
| `thomas@marquesbranding.com` | `CLIENTE-ADMIN-THOMAS-2026-07-30`  |
| `coronaigor@gmail.com`       | `CLIENTE-ADMIN-IGOR-2026-07-31`    |
| `willian.willalex@gmail.com` | `CLIENTE-ADMIN-WILLIAN-2026-07-31` |

Vercel must provide `PRODUCTION_ADMIN_INITIAL_PASSWORD` only in the
**Production** scope. A missing Supabase Auth identity is created with its
email confirmed and that initial password. An existing approved identity
receives the password only after its application account is successfully
granted `ADMIN`.

The Supabase Auth identity receives private application metadata after the
one-time password setup. Later deploys verify that marker and never reset the
administrator's password. Repeating the bootstrap remains idempotent for both
Auth and the application account. Because the set is explicitly approved and
closed in source, an existing active influencer or company account is promoted
to `ADMIN`. Archived, suspended, or banned accounts still stop the deployment.

The password value must never be committed, passed as a command-line argument,
or printed in build logs. Administrators should change the initial password
after their first successful login.

## Additional administrators

An approved administrator uses the protected backoffice form. The server:

1. revalidates the actor's Supabase session and current application account;
2. requires `ADMIN` plus `APPROVED` before looking up or inviting the target;
3. rejects identities that already own an influencer/company, archived,
   suspended, or banned account;
4. provisions the account through a narrowly granted security-definer database
   function;
5. records the grant once with the actor, `BACKOFFICE` source, request ID, and
   mandatory reason.

The database repeats the admin authorization check inside the provisioning
transaction, so hiding the form or invoking its Server Action directly cannot
bypass the role boundary.

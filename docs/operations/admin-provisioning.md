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

The production deployment workflow runs the same idempotent bootstrap after
the committed migrations and before promotion. The approved initial identity
is `thomas@marquesbranding.com`, with audit reference
`CLIENTE-ADMIN-THOMAS-2026-07-30`. A missing identity receives an invitation;
an already-provisioned matching administrator makes the step succeed without
creating another account. A conflicting initial administrator stops the
deployment.

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

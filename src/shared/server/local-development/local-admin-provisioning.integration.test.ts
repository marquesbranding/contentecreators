import { execFileSync } from "node:child_process";

import postgres from "postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const localAdminEmail = "local-admin-sync-integration@contentecreators.test";
const localAdminPassword = "ContenteCreators@01";
const database = postgres(databaseUrl, {
  connect_timeout: 5,
  idle_timeout: 1,
  max: 1,
  prepare: false,
});

async function removeLocalAdminFixture() {
  await database.begin(async (transaction) => {
    await transaction`
      select
        set_config('app.audit.actor_type', 'SYSTEM', true),
        set_config('app.audit.source', 'SCRIPT', true),
        set_config('app.audit.request_id', 'local-admin-integration-cleanup', true),
        set_config(
          'app.audit.reason',
          'Remove synthetic local administrator integration identity',
          true
        )
    `;
    const users = await transaction<{ id: string }[]>`
      select id
      from auth.users
      where email = ${localAdminEmail}
    `;

    if (!users[0]) {
      return;
    }

    await transaction`
      delete from public.accounts
      where auth_user_id = ${users[0].id}::uuid
    `;
    await transaction`
      delete from auth.identities
      where user_id = ${users[0].id}::uuid
    `;
    await transaction`
      delete from auth.users
      where id = ${users[0].id}::uuid
    `;
  });
}

function synchronizeLocalAdmin() {
  execFileSync(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      "tsx",
      "scripts/sync-local-admins.ts",
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        APP_ENV: "local",
        CRON_SECRET: "local-cron-secret-at-least-32-characters",
        DATABASE_URL: databaseUrl,
        DIRECT_URL: databaseUrl,
        LOCAL_ADMIN_EMAILS: localAdminEmail,
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
          "missing-local-publishable-key",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        PUBLIC_SOCIAL_PROOF_ENABLED: "false",
        SMTP_FROM_EMAIL: "no-reply@contentecreators.test",
        SMTP_FROM_NAME: "Contente Creators",
        SMTP_HOST: "127.0.0.1",
        SMTP_PASSWORD: "local-password",
        SMTP_PORT: "1025",
        SMTP_SECURE: "false",
        SMTP_USER: "local-user",
        SUPABASE_SERVICE_ROLE_KEY: "local-service-role-unused",
      },
      stdio: "pipe",
    },
  );
}

describeLocalStack("local administrator provisioning", () => {
  beforeEach(removeLocalAdminFixture);

  afterAll(async () => {
    await removeLocalAdminFixture();
    await database.end({ timeout: 2 });
  });

  it("creates an approved admin login and remains idempotent", async () => {
    synchronizeLocalAdmin();
    synchronizeLocalAdmin();

    const loginResponse = await fetch(
      "http://127.0.0.1:54321/auth/v1/token?grant_type=password",
      {
        body: JSON.stringify({
          email: localAdminEmail,
          password: localAdminPassword,
        }),
        headers: {
          apikey:
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
            "missing-local-publishable-key",
          "content-type": "application/json",
        },
        method: "POST",
      },
    );
    const login = (await loginResponse.json()) as {
      user?: { id?: string };
    };

    expect(loginResponse.ok).toBe(true);
    expect(login.user?.id).toBeTypeOf("string");
    const authUserId = login.user?.id;

    if (!authUserId) {
      throw new Error("Local administrator login returned no Auth user ID.");
    }

    const rows = await database<
      {
        account_count: number;
        role: string;
        status: string;
      }[]
    >`
      select
        count(*) over ()::integer as account_count,
        account.role::text as role,
        account.status::text as status
      from public.accounts account
      where account.auth_user_id = ${authUserId}::uuid
    `;

    expect(rows[0]).toEqual({
      account_count: 1,
      role: "ADMIN",
      status: "APPROVED",
    });
  });
});

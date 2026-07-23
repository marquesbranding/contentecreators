import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import { createAuditedTransactionRunner } from "@/features/audit/server";

import { createDrizzleRoleSelectionRepository } from "./drizzle-role-selection.repository";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const identityId = "90000000-0000-4000-8000-000000000009";
const requestId = "role-selection-integration";
const sqlClient = postgres(databaseUrl, {
  connect_timeout: 5,
  idle_timeout: 1,
  max: 1,
});
const drizzleClient = createDatabaseClient(databaseUrl);
const repository = createDrizzleRoleSelectionRepository({
  database: drizzleClient.database,
  runAuditedTransaction: createAuditedTransactionRunner(drizzleClient.database),
});

describeLocalStack("Drizzle role selection repository", () => {
  afterAll(async () => {
    await sqlClient.end({ timeout: 2 });
    await drizzleClient.client.end({ timeout: 2 });
  });

  it("selects one role atomically, audits it, and rejects a later change", async () => {
    await sqlClient`
      insert into auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
      )
      values (
        '00000000-0000-4000-8000-000000000000',
        ${identityId},
        'authenticated',
        'authenticated',
        'role-selection@contentecreators.test',
        extensions.crypt('LocalTest123!', extensions.gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"fixture":true}'::jsonb,
        now(),
        now(),
        '',
        '',
        '',
        ''
      )
      on conflict (id) do nothing
    `;

    const selected = await repository.selectInitialRole({
      email: "role-selection@contentecreators.test",
      identityId,
      requestId,
      role: "COMPANY",
    });
    const repeated = await repository.selectInitialRole({
      email: "role-selection@contentecreators.test",
      identityId,
      requestId: `${requestId}-repeat`,
      role: "COMPANY",
    });
    const conflicting = await repository.selectInitialRole({
      email: "role-selection@contentecreators.test",
      identityId,
      requestId: `${requestId}-conflict`,
      role: "INFLUENCER",
    });

    expect(selected).toMatchObject({
      account: {
        role: "COMPANY",
        status: "ONBOARDING",
      },
      kind: "selected",
    });
    expect(repeated.kind).toBe("already_selected");
    expect(conflicting).toMatchObject({
      account: { role: "COMPANY" },
      kind: "conflict",
    });

    const [account] = await sqlClient<
      { id: string; role: string; version: number }[]
    >`
      select id, role::text, version
      from public.accounts
      where auth_user_id = ${identityId}
    `;
    const [auditRevision] = await sqlClient<
      {
        actor_type: string;
        entity_id: string;
        operation: string;
        request_id: string;
        source: string;
      }[]
    >`
      select actor_type, entity_id, operation, request_id, source
      from public.audit_revisions
      where entity_table = 'accounts'
        and request_id = ${requestId}
      order by revision desc
      limit 1
    `;

    expect(account).toMatchObject({
      role: "COMPANY",
      version: 1,
    });
    expect(auditRevision).toEqual({
      actor_type: "SYSTEM",
      entity_id: account?.id,
      operation: "INSERT",
      request_id: requestId,
      source: "AUTH_HOOK",
    });
  });
});

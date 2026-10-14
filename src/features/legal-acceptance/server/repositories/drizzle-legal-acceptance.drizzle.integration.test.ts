import { sql } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import type { VerifiedAccountContext } from "@/features/identity/server/services/verified-account-transaction";

import { createDrizzleLegalAcceptanceRepository } from "./drizzle-legal-acceptance.repository";

/*
 * Runs the repository through Drizzle, the same way the application does. The
 * raw-SQL suite cannot catch parameter serialization mistakes such as passing
 * a JS array where Postgres expects uuid[].
 *
 * Fixtures use unique ids and stay in the local database: audit_revisions
 * references accounts as actors, so an account row cannot be deleted afterwards.
 */
const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const sqlClient = postgres(databaseUrl, { connect_timeout: 5, max: 1 });
const { database } = createDatabaseClient(databaseUrl);

const TERMS_1_0 = "f5000000-0000-4000-8000-000000000001";
const PRIVACY_1_0 = "f5000000-0000-4000-8000-000000000002";

type RunnerCallback = (
  transaction: unknown,
  context: VerifiedAccountContext,
) => Promise<unknown>;

function runnerFor(actor: VerifiedAccountContext) {
  return (_options: unknown, callback: RunnerCallback) =>
    database.transaction(async (transaction) => {
      await transaction.execute(sql`
        select
          set_config('app.jwt.auth_user_id', ${actor.authUserId}, true),
          set_config('app.jwt.account_id', ${actor.accountId}, true),
          set_config('app.jwt.account_role', ${actor.role}, true),
          set_config('app.jwt.account_status', ${actor.status}, true)
      `);
      return callback(transaction, actor);
    });
}

async function createApprovedCreator(accountId: string, authUserId: string) {
  const email = `${accountId}@legal-drizzle.test`;
  await sqlClient`
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-4000-8000-000000000000', ${authUserId}, 'authenticated',
      'authenticated', ${email}, 'x', '{}', '{}', now(), now()
    )
  `;
  await sqlClient`
    insert into public.accounts (id, auth_user_id, role, status, operational_email, approved_at)
    values (${accountId}, ${authUserId}, 'INFLUENCER', 'APPROVED', ${email}, now())
  `;
}

afterAll(async () => {
  await sqlClient.end();
});

describeLocalStack("legal acceptance repository through Drizzle", () => {
  it("lists, accepts and then stops listing the official documents", async () => {
    const accountId = crypto.randomUUID();
    const authUserId = crypto.randomUUID();
    const actor: VerifiedAccountContext = {
      accountId,
      authUserId,
      role: "INFLUENCER",
      status: "APPROVED",
    };
    await createApprovedCreator(accountId, authUserId);
    const repository = createDrizzleLegalAcceptanceRepository({
      runVerifiedAccountTransaction: runnerFor(actor) as never,
    });

    const pending = await repository.listPending({
      requestId: crypto.randomUUID(),
    });
    expect(pending.map((document) => document.id).sort()).toEqual(
      [TERMS_1_0, PRIVACY_1_0].sort(),
    );

    const accepted = await repository.accept({
      documentIds: [TERMS_1_0, PRIVACY_1_0],
      requestId: crypto.randomUUID(),
    });
    expect(accepted).toEqual({ kind: "accepted" });

    const after = await repository.listPending({
      requestId: crypto.randomUUID(),
    });
    expect(after).toEqual([]);

    const [{ count }] = await sqlClient<{ count: number }[]>`
      select count(*)::int as count
      from public.account_consents
      where account_id = ${accountId}::uuid
        and context->>'flow' = 'reacceptance'
    `;
    expect(count).toBe(2);
  });

  it("reports stale when the submitted ids no longer match the pending set", async () => {
    const accountId = crypto.randomUUID();
    const authUserId = crypto.randomUUID();
    const actor: VerifiedAccountContext = {
      accountId,
      authUserId,
      role: "INFLUENCER",
      status: "APPROVED",
    };
    await createApprovedCreator(accountId, authUserId);
    const repository = createDrizzleLegalAcceptanceRepository({
      runVerifiedAccountTransaction: runnerFor(actor) as never,
    });

    await expect(
      repository.accept({
        documentIds: [TERMS_1_0],
        requestId: crypto.randomUUID(),
      }),
    ).resolves.toEqual({ kind: "stale" });
  });
});

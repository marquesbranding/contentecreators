import { asc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";

import {
  createVerifiedAccountTransactionRunner,
  VerifiedAccountTransactionError,
} from "./verified-account-transaction";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const approvedCreatorAuthUserId = "20000000-0000-4000-8000-000000000004";
const approvedCreatorAccountId = "b0000000-0000-4000-8000-000000000004";
const contactHiddenCreatorAccountId = "b0000000-0000-4000-8000-000000000007";
const sqlClient = postgres(databaseUrl, {
  connect_timeout: 5,
  idle_timeout: 1,
  max: 1,
  prepare: false,
});
const database = drizzle(sqlClient, { schema });

async function readConnectionContext() {
  const [context] = await sqlClient<
    {
      account_id: string | null;
      account_role: string | null;
      account_status: string | null;
      auth_user_id: string | null;
      database_role: string;
      request_id: string | null;
    }[]
  >`
    select
      current_user as database_role,
      nullif(current_setting('app.jwt.auth_user_id', true), '') as auth_user_id,
      nullif(current_setting('app.jwt.account_id', true), '') as account_id,
      nullif(current_setting('app.jwt.account_role', true), '') as account_role,
      nullif(current_setting('app.jwt.account_status', true), '') as account_status,
      nullif(current_setting('app.jwt.request_id', true), '') as request_id
  `;

  return context;
}

describeLocalStack("verified account transaction", () => {
  afterAll(async () => {
    await sqlClient.end({ timeout: 2 });
  });

  it("derives local claims from the persisted account after verifying the Supabase identity", async () => {
    const resolveVerifiedAuthUserId = vi
      .fn()
      .mockResolvedValue(approvedCreatorAuthUserId);
    const runVerifiedAccountTransaction =
      createVerifiedAccountTransactionRunner({
        database,
        resolveVerifiedAuthUserId,
      });

    const result = await runVerifiedAccountTransaction(
      { requestId: "verified-account-integration" },
      async (transaction, accountContext) => {
        const [databaseContext] = await transaction.execute(
          sql<{
            account_id: string | null;
            account_role: string | null;
            account_status: string | null;
            auth_user_id: string | null;
            database_role: string;
            request_id: string | null;
          }>`
            select
              current_user as database_role,
              nullif(current_setting('app.jwt.auth_user_id', true), '') as auth_user_id,
              nullif(current_setting('app.jwt.account_id', true), '') as account_id,
              nullif(current_setting('app.jwt.account_role', true), '') as account_role,
              nullif(current_setting('app.jwt.account_status', true), '') as account_status,
              nullif(current_setting('app.jwt.request_id', true), '') as request_id
          `,
        );
        const visibleProfiles = await transaction
          .select({ accountId: schema.creatorProfiles.accountId })
          .from(schema.creatorProfiles)
          .orderBy(asc(schema.creatorProfiles.accountId));

        return {
          accountContext,
          databaseContext,
          visibleProfiles,
        };
      },
    );

    expect(resolveVerifiedAuthUserId).toHaveBeenCalledOnce();
    expect(result.accountContext).toEqual({
      accountId: approvedCreatorAccountId,
      authUserId: approvedCreatorAuthUserId,
      role: "INFLUENCER",
      status: "APPROVED",
    });
    expect(result.databaseContext).toEqual({
      account_id: approvedCreatorAccountId,
      account_role: "INFLUENCER",
      account_status: "APPROVED",
      auth_user_id: approvedCreatorAuthUserId,
      database_role: "contente_app_user",
      request_id: "verified-account-integration",
    });
    expect(result.visibleProfiles).toEqual([
      {
        accountId: approvedCreatorAccountId,
      },
      {
        accountId: contactHiddenCreatorAccountId,
      },
    ]);

    await expect(readConnectionContext()).resolves.toEqual({
      account_id: null,
      account_role: null,
      account_status: null,
      auth_user_id: null,
      database_role: "postgres",
      request_id: null,
    });
  });

  it("does not open an application transaction for an unverified identity", async () => {
    const work = vi.fn();
    const runVerifiedAccountTransaction =
      createVerifiedAccountTransactionRunner({
        database,
        resolveVerifiedAuthUserId: vi.fn().mockResolvedValue(null),
      });

    await expect(
      runVerifiedAccountTransaction(
        { requestId: "unverified-account-integration" },
        work,
      ),
    ).rejects.toEqual(new VerifiedAccountTransactionError("UNAUTHENTICATED"));
    expect(work).not.toHaveBeenCalled();
  });

  it("rejects a verified identity without an application account", async () => {
    const work = vi.fn();
    const runVerifiedAccountTransaction =
      createVerifiedAccountTransactionRunner({
        database,
        resolveVerifiedAuthUserId: vi
          .fn()
          .mockResolvedValue("90000000-0000-4000-8000-000000000001"),
      });

    await expect(
      runVerifiedAccountTransaction(
        { requestId: "missing-account-integration" },
        work,
      ),
    ).rejects.toEqual(new VerifiedAccountTransactionError("ACCOUNT_NOT_READY"));
    expect(work).not.toHaveBeenCalled();
    await expect(readConnectionContext()).resolves.toEqual({
      account_id: null,
      account_role: null,
      account_status: null,
      auth_user_id: null,
      database_role: "postgres",
      request_id: null,
    });
  });

  it("rolls back and clears role and claims when application work fails", async () => {
    const runVerifiedAccountTransaction =
      createVerifiedAccountTransactionRunner({
        database,
        resolveVerifiedAuthUserId: vi
          .fn()
          .mockResolvedValue(approvedCreatorAuthUserId),
      });

    await expect(
      runVerifiedAccountTransaction(
        { requestId: "failed-account-integration" },
        async () => {
          throw new Error("synthetic application failure");
        },
      ),
    ).rejects.toThrow("synthetic application failure");

    await expect(readConnectionContext()).resolves.toEqual({
      account_id: null,
      account_role: null,
      account_status: null,
      auth_user_id: null,
      database_role: "postgres",
      request_id: null,
    });
  });
});

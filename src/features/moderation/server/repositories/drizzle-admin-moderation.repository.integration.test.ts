import { desc, eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import { moderationCases, moderationEvents } from "@/db/schema";
import type {
  VerifiedAccountContext,
  VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import { createDrizzleAdminModerationRepository } from "./drizzle-admin-moderation.repository";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const drizzleClient = createDatabaseClient(databaseUrl);
const adminContext: VerifiedAccountContext = {
  accountId: "a0000000-0000-4000-8000-000000000001",
  authUserId: "10000000-0000-4000-8000-000000000001",
  role: "ADMIN",
  status: "APPROVED",
};
const targetAccountId = "c0000000-0000-4000-8000-000000000002";
const rollback = new Error("rollback admin moderation repository");

describeLocalStack("Drizzle admin moderation repository", () => {
  afterAll(async () => {
    await drizzleClient.client.end({ timeout: 2 });
  });

  it("round-trips requestedFields through the real repository as a jsonb array, not a double-encoded string", async () => {
    let storedRequestedFields: unknown;

    try {
      await drizzleClient.database.transaction(async (transaction) => {
        const runVerifiedTransaction: VerifiedAccountTransactionRunner = async (
          _input,
          work,
        ) => {
          await transaction.execute(sql`
              select
                set_config('app.jwt.auth_user_id', ${adminContext.authUserId}, true),
                set_config('app.jwt.account_id', ${adminContext.accountId}, true),
                set_config('app.jwt.account_role', ${adminContext.role}, true),
                set_config('app.jwt.account_status', ${adminContext.status}, true)
            `);
          await transaction.execute(
            sql.raw("set local role contente_app_user"),
          );

          return work(transaction, adminContext);
        };

        const repository = createDrizzleAdminModerationRepository({
          runVerifiedTransaction,
        });

        const transition = await repository.applyTransition({
          accountId: targetAccountId,
          action: "REQUEST_CHANGES",
          expectedAccountVersion: 1,
          expectedProfileVersion: 1,
          idempotencyKey: "moderation:request-changes:repository-integration",
          reason: "Corrija o CNPJ antes de reenviar.",
          requestedFields: [
            { field: "cnpj", note: "Confira o número informado." },
          ],
          requestId: "repository-integration-request-changes",
        });

        expect(transition.kind).toBe("applied");

        await transaction.execute(sql.raw("reset role"));

        const [event] = await transaction
          .select({ requestedFields: moderationEvents.requestedFields })
          .from(moderationEvents)
          .innerJoin(
            moderationCases,
            eq(moderationCases.id, moderationEvents.moderationCaseId),
          )
          .where(eq(moderationCases.accountId, targetAccountId))
          .orderBy(desc(moderationEvents.occurredAt))
          .limit(1);

        storedRequestedFields = event?.requestedFields;
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) {
        throw error;
      }
    }

    expect(Array.isArray(storedRequestedFields)).toBe(true);
    expect(storedRequestedFields).toEqual([
      { field: "cnpj", note: "Confira o número informado." },
    ]);
  });
});

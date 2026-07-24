import { inArray, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import { accounts } from "@/db/schema";

import { PROFILE_COMPLETION_VERSION } from "../../domain/profile-completion";
import {
  calculateProfileCompletionForAccount,
  loadProfileCompletionAggregate,
  persistProfileCompletionDirect,
} from "./drizzle-profile-completion.repository";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const drizzleClient = createDatabaseClient(databaseUrl);
const creatorAccountId = "b0000000-0000-4000-8000-000000000004";
const companyAccountId = "c0000000-0000-4000-8000-000000000004";
const rollback = new Error("rollback profile completion consistency");

describeLocalStack("Drizzle profile completion repository", () => {
  afterAll(async () => {
    await drizzleClient.client.end({ timeout: 2 });
  });

  it("uses the active calculator version for account detail, persistence and dashboard aggregates", async () => {
    let proof:
      | {
          aggregate: {
            averagePercentage: number;
            profileCount: number;
            version: number;
          };
          companyDetail: {
            percentage: number;
            version: number;
          };
          creatorDetail: {
            percentage: number;
            version: number;
          };
          persisted: {
            completionPercentage: number;
            completionVersion: number;
            id: string;
          }[];
        }
      | undefined;

    try {
      await drizzleClient.database.transaction(async (transaction) => {
        await transaction.execute(sql`
          select
            set_config('app.audit.actor_account_id', '', true),
            set_config('app.audit.actor_type', 'SYSTEM', true),
            set_config('app.audit.actor_role', '', true),
            set_config('app.audit.source', 'SCRIPT', true),
            set_config('app.audit.request_id', 'profile-completion-consistency', true),
            set_config('app.audit.reason', 'Rollback-only completion consistency test', true)
        `);
        await transaction
          .update(accounts)
          .set({ completionVersion: PROFILE_COMPLETION_VERSION + 1 })
          .where(inArray(accounts.role, ["INFLUENCER", "COMPANY"]));

        const creatorDetail = await calculateProfileCompletionForAccount(
          transaction,
          creatorAccountId,
          "INFLUENCER",
        );
        const companyDetail = await calculateProfileCompletionForAccount(
          transaction,
          companyAccountId,
          "COMPANY",
        );

        await persistProfileCompletionDirect(
          transaction,
          creatorAccountId,
          "INFLUENCER",
        );
        await persistProfileCompletionDirect(
          transaction,
          companyAccountId,
          "COMPANY",
        );

        const persisted = await transaction
          .select({
            completionPercentage: accounts.completionPercentage,
            completionVersion: accounts.completionVersion,
            id: accounts.id,
          })
          .from(accounts)
          .where(inArray(accounts.id, [creatorAccountId, companyAccountId]))
          .orderBy(accounts.id);
        const aggregate = await loadProfileCompletionAggregate(transaction);

        proof = {
          aggregate,
          companyDetail,
          creatorDetail,
          persisted,
        };
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) {
        throw error;
      }
    }

    expect(proof?.creatorDetail.version).toBe(PROFILE_COMPLETION_VERSION);
    expect(proof?.companyDetail.version).toBe(proof?.creatorDetail.version);
    expect(proof?.persisted).toEqual([
      {
        completionPercentage: proof?.creatorDetail.percentage,
        completionVersion: PROFILE_COMPLETION_VERSION,
        id: creatorAccountId,
      },
      {
        completionPercentage: proof?.companyDetail.percentage,
        completionVersion: PROFILE_COMPLETION_VERSION,
        id: companyAccountId,
      },
    ]);
    expect(proof?.aggregate).toEqual({
      averagePercentage: Math.round(
        ((proof?.creatorDetail.percentage ?? 0) +
          (proof?.companyDetail.percentage ?? 0)) /
          2,
      ),
      profileCount: 2,
      version: PROFILE_COMPLETION_VERSION,
    });
  });
});

import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import {
  accounts,
  creatorProfiles,
  moderationCases,
  moderationEvents,
} from "@/db/schema";
import type { VerifiedAccountContext } from "@/features/identity/server";

import { createDrizzleCorrectedProfileResubmissionRepository } from "./drizzle-corrected-profile-resubmission.repository";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const client = createDatabaseClient(
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
);
const accountId = "b0000000-0000-4000-8000-000000000003";
const rollback = new Error("rollback corrected profile resubmission");

describeLocalStack("Drizzle corrected profile resubmission repository", () => {
  afterAll(async () => {
    await client.client.end({ timeout: 2 });
  });

  it("publishes corrected owner fields and transitions the same account atomically", async () => {
    let proof:
      | {
          bio: string;
          eventAction: string;
          resultKind: string;
          sequence: number;
          status: string;
        }
      | undefined;

    try {
      await client.database.transaction(async (transaction) => {
        const [before] = await transaction
          .select({
            accountVersion: accounts.version,
            profileVersion: creatorProfiles.version,
          })
          .from(accounts)
          .innerJoin(
            creatorProfiles,
            eq(creatorProfiles.accountId, accounts.id),
          )
          .where(eq(accounts.id, accountId))
          .limit(1);

        if (!before) {
          throw new Error("Synthetic correction fixture was not found.");
        }

        await transaction.execute(sql`
          select
            set_config('app.jwt.auth_user_id', '20000000-0000-4000-8000-000000000003', true),
            set_config('app.jwt.account_id', ${accountId}, true),
            set_config('app.jwt.account_role', 'INFLUENCER', true),
            set_config('app.jwt.account_status', 'CHANGES_REQUESTED', true),
            set_config('app.jwt.request_id', 'corrected-profile-repository', true)
        `);
        await transaction.execute(sql.raw("set local role contente_app_user"));

        const repository =
          createDrizzleCorrectedProfileResubmissionRepository();
        const context: VerifiedAccountContext = {
          accountId,
          authUserId: "20000000-0000-4000-8000-000000000003",
          role: "INFLUENCER",
          status: "CHANGES_REQUESTED",
        };
        const result = await repository.resubmit(transaction, context, {
          command: {
            expectedAccountVersion: before.accountVersion,
            expectedProfileVersion: before.profileVersion,
            idempotencyKey: "99000000-0000-4000-8000-000000000003",
          },
          profile: {
            bio: "Perfil corrigido com informações completas para uma nova análise manual.",
            city: "Curitiba",
            contactVisibilityAccepted: false,
            creatorType: "INFLUENCER",
            displayName: "Carla em Cena",
            engagementRate: 4.5,
            followers: 15_000,
            legalName: "Carla Exemplo",
            nicheSlugs: ["beleza"],
            privacyAccepted: true,
            role: "INFLUENCER",
            socialPlatform: "TIKTOK",
            socialUrl: "https://tiktok.com/@carla-em-cena",
            state: "PR",
            termsAccepted: true,
            whatsapp: "(41) 99999-9999",
          },
          requestId: "corrected-profile-repository",
        });

        expect(result).toEqual({ kind: "submitted" });

        await transaction.execute(sql.raw("reset role"));

        const [state] = await transaction
          .select({
            bio: creatorProfiles.bio,
            eventAction: moderationEvents.action,
            sequence: moderationCases.currentSubmissionSequence,
            status: accounts.status,
          })
          .from(accounts)
          .innerJoin(
            creatorProfiles,
            eq(creatorProfiles.accountId, accounts.id),
          )
          .innerJoin(
            moderationCases,
            eq(moderationCases.accountId, accounts.id),
          )
          .innerJoin(
            moderationEvents,
            eq(moderationEvents.moderationCaseId, moderationCases.id),
          )
          .where(
            eq(
              moderationEvents.idempotencyKey,
              "99000000-0000-4000-8000-000000000003",
            ),
          )
          .limit(1);

        if (!state) {
          throw new Error("Corrected profile proof was not produced.");
        }

        proof = {
          ...state,
          bio: state.bio ?? "",
          resultKind: result.kind,
        };
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) {
        throw error;
      }
    }

    expect(proof).toEqual({
      bio: "Perfil corrigido com informações completas para uma nova análise manual.",
      eventAction: "RESUBMIT",
      resultKind: "submitted",
      sequence: 2,
      status: "PENDING_REVIEW",
    });
  });
});

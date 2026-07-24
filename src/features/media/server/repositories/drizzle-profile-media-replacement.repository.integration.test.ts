import { asc, eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import {
  accounts,
  auditRevisions,
  creatorProfiles,
  mediaAssets,
} from "@/db/schema";
import type {
  VerifiedAccountContext,
  VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import { createDrizzleProfileMediaReplacementRepository } from "./drizzle-profile-media-replacement.repository";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const drizzleClient = createDatabaseClient(databaseUrl);
const creatorContext: VerifiedAccountContext = {
  accountId: "b0000000-0000-4000-8000-000000000004",
  authUserId: "20000000-0000-4000-8000-000000000004",
  role: "INFLUENCER",
  status: "APPROVED",
};
const oldAssetId = "77000000-0000-4000-8000-000000000001";
const newAssetId = "77000000-0000-4000-8000-000000000002";
const requestId = "profile-media-replacement-integration";
const rollback = new Error("rollback profile media replacement");

describeLocalStack("Drizzle profile media replacement repository", () => {
  afterAll(async () => {
    await drizzleClient.client.end({ timeout: 2 });
  });

  it("activates a new object, archives its predecessor and preserves both histories", async () => {
    let result:
      | {
          accountCompletion: {
            percentage: number;
            version: number;
          };
          auditRows: {
            actorAccountId: string | null;
            entityId: string;
            entityTable: string;
            operation: string;
          }[];
          first: {
            assetId: string;
            kind: "activated";
            profileVersion: number;
            replacedAssetId: string | null;
          };
          mediaRows: {
            archivedAt: Date | null;
            id: string;
            replacedByAssetId: string | null;
            status: string;
          }[];
          profileAssetId: string | null;
          repeated: {
            assetId: string;
            kind: "activated";
            profileVersion: number;
            replacedAssetId: string | null;
          };
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
            set_config('app.audit.request_id', 'profile-media-replacement-setup', true),
            set_config('app.audit.reason', 'Synthetic rollback-only replacement setup', true)
        `);
        await transaction.insert(mediaAssets).values([
          {
            bucketName: "profile-media",
            id: oldAssetId,
            kind: "AVATAR",
            mimeType: "image/png",
            objectPath: `${creatorContext.accountId}/avatar/${oldAssetId}.png`,
            ownerAccountId: creatorContext.accountId,
            sizeBytes: 1024,
            status: "ACTIVE",
          },
          {
            bucketName: "profile-media",
            id: newAssetId,
            kind: "AVATAR",
            mimeType: "image/png",
            objectPath: `${creatorContext.accountId}/avatar/${newAssetId}.png`,
            ownerAccountId: creatorContext.accountId,
            sizeBytes: 2048,
            status: "PENDING",
          },
        ]);
        await transaction
          .update(creatorProfiles)
          .set({ avatarAssetId: oldAssetId })
          .where(eq(creatorProfiles.accountId, creatorContext.accountId));

        const runVerifiedAccountTransaction: VerifiedAccountTransactionRunner =
          async (_input, work) => {
            await transaction.execute(sql`
              select
                set_config('app.jwt.auth_user_id', ${creatorContext.authUserId}, true),
                set_config('app.jwt.account_id', ${creatorContext.accountId}, true),
                set_config('app.jwt.account_role', ${creatorContext.role}, true),
                set_config('app.jwt.account_status', ${creatorContext.status}, true),
                set_config('app.jwt.request_id', ${requestId}, true)
            `);
            await transaction.execute(
              sql.raw("set local role contente_app_user"),
            );

            return work(transaction, creatorContext);
          };
        const repository = createDrizzleProfileMediaReplacementRepository({
          runVerifiedAccountTransaction,
        });
        const input = {
          assetId: newAssetId,
          expectedCurrentAssetId: oldAssetId,
          purpose: "AVATAR" as const,
          requestId,
        };
        const first = await repository.activateProfileMedia(input);
        const repeated = await repository.activateProfileMedia(input);

        if (first.kind !== "activated" || repeated.kind !== "activated") {
          throw new Error("Expected idempotent activation.");
        }

        await transaction.execute(sql.raw("reset role"));
        const mediaRows = await transaction
          .select({
            archivedAt: mediaAssets.archivedAt,
            id: mediaAssets.id,
            replacedByAssetId: mediaAssets.replacedByAssetId,
            status: mediaAssets.status,
          })
          .from(mediaAssets)
          .where(sql`${mediaAssets.id} in (${oldAssetId}, ${newAssetId})`)
          .orderBy(asc(mediaAssets.id));
        const [profile] = await transaction
          .select({ avatarAssetId: creatorProfiles.avatarAssetId })
          .from(creatorProfiles)
          .where(eq(creatorProfiles.accountId, creatorContext.accountId));
        const [account] = await transaction
          .select({
            completionPercentage: accounts.completionPercentage,
            completionVersion: accounts.completionVersion,
          })
          .from(accounts)
          .where(eq(accounts.id, creatorContext.accountId));
        const auditRows = await transaction
          .select({
            actorAccountId: auditRevisions.actorAccountId,
            entityId: auditRevisions.entityId,
            entityTable: auditRevisions.entityTable,
            operation: auditRevisions.operation,
          })
          .from(auditRevisions)
          .where(eq(auditRevisions.requestId, requestId))
          .orderBy(asc(auditRevisions.revision));

        result = {
          accountCompletion: {
            percentage: account?.completionPercentage ?? -1,
            version: account?.completionVersion ?? -1,
          },
          auditRows,
          first,
          mediaRows,
          profileAssetId: profile?.avatarAssetId ?? null,
          repeated,
        };
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) {
        throw error;
      }
    }

    expect(result).toEqual({
      accountCompletion: {
        percentage: 85,
        version: 1,
      },
      auditRows: [
        {
          actorAccountId: creatorContext.accountId,
          entityId: newAssetId,
          entityTable: "media_assets",
          operation: "UPDATE",
        },
        {
          actorAccountId: creatorContext.accountId,
          entityId: oldAssetId,
          entityTable: "media_assets",
          operation: "ARCHIVE",
        },
        {
          actorAccountId: creatorContext.accountId,
          entityId: "d0000000-0000-4000-8000-000000000004",
          entityTable: "creator_profiles",
          operation: "UPDATE",
        },
        {
          actorAccountId: creatorContext.accountId,
          entityId: creatorContext.accountId,
          entityTable: "accounts",
          operation: "UPDATE",
        },
      ],
      first: {
        assetId: newAssetId,
        kind: "activated",
        profileVersion: expect.any(Number),
        replacedAssetId: oldAssetId,
      },
      mediaRows: [
        {
          archivedAt: expect.any(Date),
          id: oldAssetId,
          replacedByAssetId: newAssetId,
          status: "ARCHIVED",
        },
        {
          archivedAt: null,
          id: newAssetId,
          replacedByAssetId: null,
          status: "ACTIVE",
        },
      ],
      profileAssetId: newAssetId,
      repeated: {
        assetId: newAssetId,
        kind: "activated",
        profileVersion: expect.any(Number),
        replacedAssetId: oldAssetId,
      },
    });
  });
});

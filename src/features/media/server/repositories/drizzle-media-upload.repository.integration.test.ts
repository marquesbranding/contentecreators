import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import { auditRevisions, mediaAssets } from "@/db/schema";
import type {
  VerifiedAccountContext,
  VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import { createDrizzleMediaUploadRepository } from "./drizzle-media-upload.repository";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const drizzleClient = createDatabaseClient(databaseUrl);
const creatorContext: VerifiedAccountContext = {
  accountId: "b0000000-0000-4000-8000-000000000001",
  authUserId: "20000000-0000-4000-8000-000000000001",
  role: "INFLUENCER",
  status: "ONBOARDING",
};
const assetPath = `${creatorContext.accountId}/avatar/75000000-0000-4000-8000-000000000001.png`;
const requestId = "media-repository-integration";
const rollback = new Error("rollback media repository integration");

describeLocalStack("Drizzle media upload repository", () => {
  afterAll(async () => {
    await drizzleClient.client.end({ timeout: 2 });
  });

  it("persists validated pending metadata once with verified owner and audit context", async () => {
    let result:
      | {
          auditRows: {
            actorAccountId: string | null;
            actorType: string;
            entityId: string;
            operation: string;
            requestId: string | null;
          }[];
          firstId: string;
          mediaRows: {
            bucketName: string;
            id: string;
            kind: string;
            mimeType: string;
            ownerAccountId: string;
            sizeBytes: number;
            status: string;
          }[];
          repeatedId: string;
        }
      | undefined;

    try {
      await drizzleClient.database.transaction(async (transaction) => {
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
        const repository = createDrizzleMediaUploadRepository({
          runVerifiedAccountTransaction,
        });
        const input = {
          bucketName: "profile-media" as const,
          kind: "AVATAR" as const,
          mimeType: "image/png" as const,
          objectPath: assetPath,
          requestId,
          sizeBytes: 2048,
        };

        const first = await repository.createPendingMedia(input);
        const repeated = await repository.createPendingMedia(input);

        await transaction.execute(sql.raw("reset role"));
        const mediaRows = await transaction
          .select({
            bucketName: mediaAssets.bucketName,
            id: mediaAssets.id,
            kind: mediaAssets.kind,
            mimeType: mediaAssets.mimeType,
            ownerAccountId: mediaAssets.ownerAccountId,
            sizeBytes: mediaAssets.sizeBytes,
            status: mediaAssets.status,
          })
          .from(mediaAssets)
          .where(eq(mediaAssets.objectPath, assetPath));
        const auditRows = await transaction
          .select({
            actorAccountId: auditRevisions.actorAccountId,
            actorType: auditRevisions.actorType,
            entityId: auditRevisions.entityId,
            operation: auditRevisions.operation,
            requestId: auditRevisions.requestId,
          })
          .from(auditRevisions)
          .where(eq(auditRevisions.requestId, requestId));

        result = {
          auditRows,
          firstId: first.id,
          mediaRows,
          repeatedId: repeated.id,
        };
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) {
        throw error;
      }
    }

    expect(result).toEqual({
      auditRows: [
        {
          actorAccountId: creatorContext.accountId,
          actorType: "USER",
          entityId: result?.firstId,
          operation: "INSERT",
          requestId,
        },
      ],
      firstId: result?.firstId,
      mediaRows: [
        {
          bucketName: "profile-media",
          id: result?.firstId,
          kind: "AVATAR",
          mimeType: "image/png",
          ownerAccountId: creatorContext.accountId,
          sizeBytes: 2048,
          status: "PENDING",
        },
      ],
      repeatedId: result?.firstId,
    });
  });
});

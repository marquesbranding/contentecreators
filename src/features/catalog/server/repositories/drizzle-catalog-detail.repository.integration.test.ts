import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import { creatorProfiles } from "@/db/schema";
import {
  AccountAccessError,
  createVerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import { createCatalogDetailService } from "../services/catalog-detail.service";
import { findEligibleCatalogCreator } from "./drizzle-catalog-detail.repository";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const approvedCompanyAuthUserId = "30000000-0000-4000-8000-000000000004";
const approvedCreatorAuthUserId = "20000000-0000-4000-8000-000000000004";
const pendingCompanyAuthUserId = "30000000-0000-4000-8000-000000000002";
const approvedCreatorAccountId = "b0000000-0000-4000-8000-000000000004";
const suspendedCreatorAccountId = "b0000000-0000-4000-8000-000000000005";
const client = createDatabaseClient(databaseUrl);
let approvedCreatorId = "";
let suspendedCreatorId = "";

function createService(authUserId: string) {
  return createCatalogDetailService({
    findEligibleCreator: findEligibleCatalogCreator,
    runVerifiedAccountTransaction: createVerifiedAccountTransactionRunner({
      database: client.database,
      resolveVerifiedAuthUserId: async () => authUserId,
    }),
  });
}

describeLocalStack("Drizzle catalog detail repository", () => {
  beforeAll(async () => {
    const profiles = await client.database
      .select({
        accountId: creatorProfiles.accountId,
        id: creatorProfiles.id,
      })
      .from(creatorProfiles)
      .where(eq(creatorProfiles.accountId, approvedCreatorAccountId));
    const suspendedProfiles = await client.database
      .select({ id: creatorProfiles.id })
      .from(creatorProfiles)
      .where(eq(creatorProfiles.accountId, suspendedCreatorAccountId));

    approvedCreatorId = profiles[0]?.id ?? "";
    suspendedCreatorId = suspendedProfiles[0]?.id ?? "";

    if (!approvedCreatorId || !suspendedCreatorId) {
      throw new Error("Expected catalog integration fixtures were not found.");
    }
  });

  afterAll(async () => {
    await client.client.end({ timeout: 2 });
  });

  it("returns a minimal eligible detail and consent-gated actions to an approved company", async () => {
    const result = await createService(approvedCompanyAuthUserId).load({
      creatorId: approvedCreatorId,
      requestId: `catalog-company-${crypto.randomUUID()}`,
    });

    expect(result).toMatchObject({
      contact: {
        email: {
          href: "mailto:creator-approved@contentecreators.test",
        },
        social: [
          {
            href: "https://instagram.com/fixture_0004",
            platform: "INSTAGRAM",
          },
        ],
        status: "AVAILABLE",
        whatsapp: {
          href: "https://wa.me/5511999990004",
        },
      },
      creatorId: approvedCreatorId,
      displayName: "Diego Aprova",
      location: { city: "Rio de Janeiro", state: "RJ" },
      metrics: [
        expect.objectContaining({
          engagementRate: 4.25,
          platform: "INSTAGRAM",
          source: "SELF_REPORTED",
        }),
      ],
      niches: expect.any(Array),
      socialProfiles: [
        {
          handle: "@fixture_0004",
          platform: "INSTAGRAM",
        },
      ],
    });
    expect(JSON.stringify(result)).not.toMatch(
      /accountId|authUserId|operationalEmail|whatsappE164|moderation|audit|blocked|consentDocument|objectPath|bucketName/i,
    );
  });

  it("excludes an approved influencer's own creator detail", async () => {
    const result = await createService(approvedCreatorAuthUserId).load({
      creatorId: approvedCreatorId,
      requestId: `catalog-influencer-${crypto.randomUUID()}`,
    });

    expect(result).toBeNull();
  });

  it("returns null for a suspended creator without leaking prior detail", async () => {
    await expect(
      createService(approvedCompanyAuthUserId).load({
        creatorId: suspendedCreatorId,
        requestId: `catalog-suspended-${crypto.randomUUID()}`,
      }),
    ).resolves.toBeNull();
  });

  it("denies a non-approved viewer before the catalog repository executes", async () => {
    await expect(
      createService(pendingCompanyAuthUserId).load({
        creatorId: approvedCreatorId,
        requestId: `catalog-pending-${crypto.randomUUID()}`,
      }),
    ).rejects.toBeInstanceOf(AccountAccessError);
  });
});

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import { accounts, companyProfiles, mediaAssets } from "@/db/schema";
import {
  AccountAccessError,
  createVerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import { createCompanyCarouselService } from "../services/company-carousel.service";
import {
  listCompanySegmentFacets,
  listEligibleCarouselCompanies,
} from "./company-carousel.repository";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const approvedInfluencerAuthUserId = "20000000-0000-4000-8000-000000000004";
const approvedCompanyAuthUserId = "30000000-0000-4000-8000-000000000004";
const approvedCompanyAccountId = "c0000000-0000-4000-8000-000000000004";
const approvedCompanyProfileId = "e0000000-0000-4000-8000-000000000004";
const logoAssetId = "94000000-0000-4000-8000-000000000004";
const client = createDatabaseClient(databaseUrl);

function createRunner(authUserId: string) {
  return createVerifiedAccountTransactionRunner({
    database: client.database,
    resolveVerifiedAuthUserId: async () => authUserId,
  });
}

async function restoreEligibleFixture() {
  await client.database
    .update(accounts)
    .set({
      archivedAt: null,
      completionPercentage: 100,
      status: "APPROVED",
    })
    .where(eq(accounts.id, approvedCompanyAccountId));
  await client.database
    .update(companyProfiles)
    .set({
      archivedAt: null,
      logoAssetId,
    })
    .where(eq(companyProfiles.id, approvedCompanyProfileId));
  await client.database
    .update(mediaAssets)
    .set({
      archivedAt: null,
      replacedByAssetId: null,
      status: "ACTIVE",
    })
    .where(eq(mediaAssets.id, logoAssetId));
}

describeLocalStack("company carousel repository", () => {
  beforeAll(async () => {
    await client.database
      .update(companyProfiles)
      .set({
        logoAssetId: null,
      })
      .where(eq(companyProfiles.id, approvedCompanyProfileId));
    await client.database
      .delete(mediaAssets)
      .where(eq(mediaAssets.id, logoAssetId));
    await client.database.insert(mediaAssets).values({
      bucketName: "profile-media",
      id: logoAssetId,
      kind: "LOGO",
      mimeType: "image/png",
      objectPath: `${approvedCompanyAccountId}/logo/${logoAssetId}.png`,
      ownerAccountId: approvedCompanyAccountId,
      sizeBytes: 1_024,
      status: "ACTIVE",
    });
    await restoreEligibleFixture();
  });

  afterAll(async () => {
    await client.database
      .update(companyProfiles)
      .set({
        archivedAt: null,
        logoAssetId: null,
      })
      .where(eq(companyProfiles.id, approvedCompanyProfileId));
    await client.database
      .update(accounts)
      .set({
        archivedAt: null,
        completionPercentage: 100,
        status: "APPROVED",
      })
      .where(eq(accounts.id, approvedCompanyAccountId));
    await client.database
      .delete(mediaAssets)
      .where(eq(mediaAssets.id, logoAssetId));
    await client.client.end({ timeout: 2 });
  });

  it("returns the minimal approved company presentation to an approved influencer", async () => {
    const service = createCompanyCarouselService({
      repository: {
        listCompanySegmentFacets,
        listEligibleCompanies: listEligibleCarouselCompanies,
      },
      runVerifiedAccountTransaction: createRunner(approvedInfluencerAuthUserId),
    });

    const result = await service.list(
      { limit: 12 },
      `carousel-safe-${crypto.randomUUID()}`,
    );

    expect(result).toMatchObject({
      facets: { segments: expect.any(Array) },
      items: [
        {
          displayName: "Empresa Quatro",
          logo: {
            alt: "Logo da Empresa Quatro",
            assetId: logoAssetId,
          },
          websiteUrl: "https://example.test/empresa-quatro",
        },
      ],
      limit: 12,
    });
    expect(JSON.stringify(result)).not.toMatch(
      /12345678000438|legalName|cnpj|address|email|whatsApp|contact|account|moderation|audit|objectPath|bucketName/i,
    );
  });

  it("omits the company immediately when account, profile, completion, or logo becomes ineligible", async () => {
    const service = createCompanyCarouselService({
      repository: {
        listCompanySegmentFacets,
        listEligibleCompanies: listEligibleCarouselCompanies,
      },
      runVerifiedAccountTransaction: createRunner(approvedInfluencerAuthUserId),
    });
    const list = () =>
      service.list({}, `carousel-ineligible-${crypto.randomUUID()}`);

    try {
      await client.database
        .update(accounts)
        .set({ archivedAt: new Date() })
        .where(eq(accounts.id, approvedCompanyAccountId));
      await expect(list()).resolves.toMatchObject({ items: [] });

      await restoreEligibleFixture();
      await client.database
        .update(accounts)
        .set({ status: "PENDING_REVIEW" })
        .where(eq(accounts.id, approvedCompanyAccountId));
      await expect(list()).resolves.toMatchObject({ items: [] });

      await restoreEligibleFixture();
      await client.database
        .update(companyProfiles)
        .set({ archivedAt: new Date() })
        .where(eq(companyProfiles.id, approvedCompanyProfileId));
      await expect(list()).resolves.toMatchObject({ items: [] });

      await restoreEligibleFixture();
      await client.database
        .update(accounts)
        .set({ completionPercentage: 99 })
        .where(eq(accounts.id, approvedCompanyAccountId));
      await expect(list()).resolves.toMatchObject({ items: [] });

      await restoreEligibleFixture();
      await client.database
        .update(mediaAssets)
        .set({ status: "ARCHIVED" })
        .where(eq(mediaAssets.id, logoAssetId));
      await expect(list()).resolves.toMatchObject({ items: [] });
    } finally {
      await restoreEligibleFixture();
    }
  });

  it("includes a company's free-text segment in the facets", async () => {
    const service = createCompanyCarouselService({
      repository: {
        listCompanySegmentFacets,
        listEligibleCompanies: listEligibleCarouselCompanies,
      },
      runVerifiedAccountTransaction: createRunner(approvedInfluencerAuthUserId),
    });

    try {
      await client.database
        .update(companyProfiles)
        .set({ segment: "Marketing" })
        .where(eq(companyProfiles.id, approvedCompanyProfileId));

      const result = await service.list(
        { limit: 12 },
        `carousel-facets-${crypto.randomUUID()}`,
      );

      expect(result.facets.segments).toContain("Marketing");
    } finally {
      await client.database
        .update(companyProfiles)
        .set({ segment: "Alimentação" })
        .where(eq(companyProfiles.id, approvedCompanyProfileId));
      await restoreEligibleFixture();
    }
  });

  it("denies an approved company before executing the carousel query", async () => {
    const service = createCompanyCarouselService({
      repository: {
        listCompanySegmentFacets,
        listEligibleCompanies: listEligibleCarouselCompanies,
      },
      runVerifiedAccountTransaction: createRunner(approvedCompanyAuthUserId),
    });

    await expect(
      service.list({}, `carousel-company-denied-${crypto.randomUUID()}`),
    ).rejects.toEqual(new AccountAccessError("ROLE_FORBIDDEN"));
  });
});

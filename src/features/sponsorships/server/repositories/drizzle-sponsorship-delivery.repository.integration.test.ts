import { inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import { mediaAssets, sponsorshipPlacements } from "@/db/schema";

import { createSponsorshipDeliveryService } from "../services/sponsorship-delivery.service";
import { createDrizzleSponsorshipDeliveryRepository } from "./drizzle-sponsorship-delivery.repository";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const client = createDatabaseClient(databaseUrl);
const seedAdminAccountId = "a0000000-0000-4000-8000-000000000001";
const seedCompanyAccountId = "c0000000-0000-4000-8000-000000000004";

describeLocalStack("Drizzle sponsorship delivery repository", () => {
  afterAll(async () => {
    await client.client.end({ timeout: 2 });
  });

  it("prefilters public candidates and emits only a signed renderer DTO", async () => {
    const assetId = crypto.randomUUID();
    const genericPlacementId = crypto.randomUUID();
    const participantPlacementId = crypto.randomUUID();
    const futurePlacementId = crypto.randomUUID();
    const placementIds = [
      genericPlacementId,
      participantPlacementId,
      futurePlacementId,
    ];
    const slotKey = `integration-landing-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date("2026-08-01T12:00:00.000Z");

    try {
      await client.database.insert(mediaAssets).values({
        bucketName: "sponsorship-media",
        height: 720,
        id: assetId,
        kind: "SPONSORSHIP_CREATIVE",
        mimeType: "image/webp",
        objectPath: `integration/${assetId}.webp`,
        ownerAccountId: seedAdminAccountId,
        sizeBytes: 1_024,
        status: "ACTIVE",
        width: 1_280,
      });
      await client.database.insert(sponsorshipPlacements).values([
        {
          advertiserLabel: "Marca externa",
          audience: "ALL",
          body: "Criativo público seguro.",
          creativeAssetId: assetId,
          endsAt: new Date("2026-09-01T00:00:00.000Z"),
          id: genericPlacementId,
          isActive: true,
          placementType: "TOP_BANNER",
          slotKey,
          sortOrder: 10,
          startsAt: new Date("2026-07-01T00:00:00.000Z"),
          title: "Campanha pública",
        },
        {
          advertiserAccountId: seedCompanyAccountId,
          advertiserLabel: "Participante da plataforma",
          audience: "ALL",
          creativeAssetId: assetId,
          endsAt: new Date("2026-09-01T00:00:00.000Z"),
          id: participantPlacementId,
          isActive: true,
          placementType: "TOP_BANNER",
          slotKey,
          sortOrder: 1,
          startsAt: new Date("2026-07-01T00:00:00.000Z"),
          title: "Prova social ainda desabilitada",
        },
        {
          advertiserLabel: "Campanha futura",
          audience: "ALL",
          creativeAssetId: assetId,
          endsAt: new Date("2026-11-01T00:00:00.000Z"),
          id: futurePlacementId,
          isActive: true,
          placementType: "TOP_BANNER",
          slotKey,
          sortOrder: 2,
          startsAt: new Date("2026-10-01T00:00:00.000Z"),
          title: "Ainda não iniciada",
        },
      ]);

      const repository = createDrizzleSponsorshipDeliveryRepository(
        client.database,
      );
      const candidates = await repository.listCandidates({
        allowedPlacementTypes: ["TOP_BANNER"],
        limit: 10,
        now,
        route: "PUBLIC_LANDING",
        slotKey,
        viewer: "PUBLIC",
      });

      expect(candidates.map(({ placement }) => placement.id)).toEqual([
        genericPlacementId,
      ]);

      const service = createSponsorshipDeliveryService({
        repository,
        async resolveSignedMedia(requestedAssetId, placementId, signingNow) {
          const target = await repository.findSigningTarget({
            assetId: requestedAssetId,
            now: signingNow,
            placementId,
          });

          return target
            ? {
                height: target.height,
                url: "https://storage.example.test/signed-campaign",
                width: target.width,
              }
            : null;
        },
      });
      const result = await service.load({
        allowedPlacementTypes: ["TOP_BANNER"],
        limit: 10,
        now,
        route: "PUBLIC_LANDING",
        slotKey,
        viewer: "PUBLIC",
      });

      expect(result).toEqual([
        expect.objectContaining({
          id: genericPlacementId,
          media: {
            alt: "Campanha pública — Marca externa",
            url: "https://storage.example.test/signed-campaign",
          },
          title: "Campanha pública",
          type: "TOP_BANNER",
        }),
      ]);
      expect(JSON.stringify(result)).not.toMatch(
        /assetId|bucketName|objectPath|ownerAccount|integration\//iu,
      );
    } finally {
      await client.database
        .delete(sponsorshipPlacements)
        .where(inArray(sponsorshipPlacements.id, placementIds));
      await client.database
        .delete(mediaAssets)
        .where(inArray(mediaAssets.id, [assetId]));
    }
  });
});

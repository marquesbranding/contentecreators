import { and, asc, eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import {
  auditRevisions,
  mediaAssets,
  sponsorshipPlacements,
} from "@/db/schema";
import { createVerifiedAccountTransactionRunner } from "@/features/identity/server";

import { createAdminSponsorshipPlacementService } from "../services/admin-sponsorship-placement.service";
import { drizzleSponsorshipPlacementRepository } from "./drizzle-sponsorship-placement.repository";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const client = createDatabaseClient(databaseUrl);
const seedAdmin = {
  accountId: "a0000000-0000-4000-8000-000000000001",
  authUserId: "10000000-0000-4000-8000-000000000001",
};

function createService() {
  return createAdminSponsorshipPlacementService({
    repository: drizzleSponsorshipPlacementRepository,
    runVerifiedTransaction: createVerifiedAccountTransactionRunner({
      database: client.database,
      resolveVerifiedAuthUserId: async () => seedAdmin.authUserId,
    }),
  });
}

describeLocalStack("Drizzle sponsorship placement repository", () => {
  afterAll(async () => {
    await client.client.end({ timeout: 2 });
  });

  it("persists audited CRUD with private media and optimistic versions", async () => {
    const activeAssetId = crypto.randomUUID();
    const pendingAssetId = crypto.randomUUID();
    const requestPrefix = crypto.randomUUID();
    const service = createService();
    let createdPlacementId = "";

    try {
      await client.database.insert(mediaAssets).values([
        {
          bucketName: "sponsorship-media",
          height: 720,
          id: activeAssetId,
          kind: "SPONSORSHIP_CREATIVE",
          mimeType: "image/webp",
          objectPath: `integration/${activeAssetId}.webp`,
          ownerAccountId: seedAdmin.accountId,
          sizeBytes: 1_024,
          status: "ACTIVE",
          width: 1_280,
        },
        {
          bucketName: "sponsorship-media",
          height: 720,
          id: pendingAssetId,
          kind: "SPONSORSHIP_CREATIVE",
          mimeType: "image/webp",
          objectPath: `integration/${pendingAssetId}.webp`,
          ownerAccountId: seedAdmin.accountId,
          sizeBytes: 1_024,
          status: "PENDING",
          width: 1_280,
        },
      ]);

      const created = await service.create({
        placement: {
          advertiserAccountId: null,
          advertiserLabel: "Marca de integração",
          audience: "ALL",
          body: "Criativo privado para teste local.",
          creativeAssetId: activeAssetId,
          endsAt: new Date("2030-01-31T23:59:59.000Z"),
          featuredCreatorProfileId: null,
          linkLabel: "Conhecer",
          linkUrl: "https://example.test/integracao",
          placementType: "TOP_BANNER",
          slotKey: "integration-top",
          sortOrder: 30,
          startsAt: new Date("2020-01-01T00:00:00.000Z"),
          title: "Campanha de integração",
        },
        reason: "Cadastrar campanha para validação integrada",
        requestId: `${requestPrefix}:create`,
      });
      createdPlacementId = created.id;

      expect(created).toMatchObject({
        isActive: false,
        version: 1,
      });

      const updated = await service.update({
        expectedVersion: created.version,
        patch: {
          creativeAssetId: pendingAssetId,
          sortOrder: 10,
          title: "Campanha integrada atualizada",
        },
        placementId: created.id,
        reason: "Atualizar ordem e título da campanha",
        requestId: `${requestPrefix}:update`,
      });

      expect(updated).toMatchObject({
        sortOrder: 10,
        title: "Campanha integrada atualizada",
        version: 2,
      });
      await expect(
        service.update({
          expectedVersion: created.version,
          patch: { title: "Atualização concorrente obsoleta" },
          placementId: created.id,
          reason: "Simular atualização concorrente obsoleta",
          requestId: `${requestPrefix}:stale`,
        }),
      ).rejects.toMatchObject({ code: "VERSION_CONFLICT" });

      const activated = await service.activate({
        expectedVersion: updated.version,
        placementId: created.id,
        reason: "Ativar campanha com mídia privada validada",
        requestId: `${requestPrefix}:activate`,
      });

      expect(activated).toMatchObject({
        creativeAssetId: pendingAssetId,
        isActive: true,
        version: 3,
      });

      const retainedAssets = await client.database
        .select({
          archivedAt: mediaAssets.archivedAt,
          id: mediaAssets.id,
          replacedByAssetId: mediaAssets.replacedByAssetId,
          status: mediaAssets.status,
          version: mediaAssets.version,
        })
        .from(mediaAssets)
        .where(inArray(mediaAssets.id, [activeAssetId, pendingAssetId]));

      expect(retainedAssets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            archivedAt: expect.any(Date),
            id: activeAssetId,
            replacedByAssetId: pendingAssetId,
            status: "ARCHIVED",
            version: 2,
          }),
          expect.objectContaining({
            archivedAt: null,
            id: pendingAssetId,
            replacedByAssetId: null,
            status: "ACTIVE",
            version: 2,
          }),
        ]),
      );

      const mediaRevisions = await client.database
        .select({
          actorAccountId: auditRevisions.actorAccountId,
          operation: auditRevisions.operation,
          reason: auditRevisions.reason,
          requestId: auditRevisions.requestId,
          source: auditRevisions.source,
        })
        .from(auditRevisions)
        .where(
          and(
            eq(auditRevisions.entityId, pendingAssetId),
            eq(auditRevisions.requestId, `${requestPrefix}:activate`),
          ),
        )
        .orderBy(asc(auditRevisions.revision));

      expect(mediaRevisions).toEqual([
        expect.objectContaining({
          actorAccountId: seedAdmin.accountId,
          operation: "UPDATE",
          requestId: `${requestPrefix}:activate`,
          source: "BACKOFFICE",
        }),
      ]);
      expect(mediaRevisions.every(({ reason }) => reason?.trim())).toBe(true);

      const predecessorRevisions = await client.database
        .select({
          actorAccountId: auditRevisions.actorAccountId,
          operation: auditRevisions.operation,
          requestId: auditRevisions.requestId,
          source: auditRevisions.source,
        })
        .from(auditRevisions)
        .where(
          and(
            eq(auditRevisions.entityId, activeAssetId),
            eq(auditRevisions.requestId, `${requestPrefix}:update`),
          ),
        );

      expect(predecessorRevisions).toEqual([
        expect.objectContaining({
          actorAccountId: seedAdmin.accountId,
          operation: "ARCHIVE",
          requestId: `${requestPrefix}:update`,
          source: "BACKOFFICE",
        }),
      ]);

      const listed = await service.list({
        archive: "ACTIVE",
        page: 1,
        pageSize: 20,
        requestId: `${requestPrefix}:list`,
        search: "integrada atualizada",
        state: "ACTIVE",
      });

      expect(listed.items).toEqual([
        expect.objectContaining({
          id: created.id,
          isActive: true,
          sortOrder: 10,
        }),
      ]);

      const archived = await service.archive({
        expectedVersion: activated.version,
        placementId: created.id,
        reason: "Arquivar campanha após validação integrada",
        requestId: `${requestPrefix}:archive`,
      });

      expect(archived).toMatchObject({
        isActive: false,
        version: 4,
      });
      expect(archived.archivedAt).toBeInstanceOf(Date);
      await expect(
        service.get({
          placementId: created.id,
          requestId: `${requestPrefix}:get-active`,
        }),
      ).resolves.toBeNull();
      await expect(
        service.get({
          includeArchived: true,
          placementId: created.id,
          requestId: `${requestPrefix}:get-archived`,
        }),
      ).resolves.toMatchObject({ id: created.id, version: 4 });
      await expect(
        service.list({
          page: 1,
          pageSize: 20,
          requestId: `${requestPrefix}:list-archived`,
          search: "integrada atualizada",
          state: "ARCHIVED",
        }),
      ).resolves.toMatchObject({
        items: [expect.objectContaining({ id: created.id })],
        totalItems: 1,
      });

      const revisions = await client.database
        .select({
          actorAccountId: auditRevisions.actorAccountId,
          operation: auditRevisions.operation,
          reason: auditRevisions.reason,
          requestId: auditRevisions.requestId,
          source: auditRevisions.source,
        })
        .from(auditRevisions)
        .where(eq(auditRevisions.entityId, created.id))
        .orderBy(asc(auditRevisions.revision));

      expect(revisions).toEqual([
        expect.objectContaining({
          actorAccountId: seedAdmin.accountId,
          operation: "INSERT",
          requestId: `${requestPrefix}:create`,
          source: "BACKOFFICE",
        }),
        expect.objectContaining({
          actorAccountId: seedAdmin.accountId,
          operation: "UPDATE",
          requestId: `${requestPrefix}:update`,
          source: "BACKOFFICE",
        }),
        expect.objectContaining({
          actorAccountId: seedAdmin.accountId,
          operation: "UPDATE",
          requestId: `${requestPrefix}:activate`,
          source: "BACKOFFICE",
        }),
        expect.objectContaining({
          actorAccountId: seedAdmin.accountId,
          operation: "ARCHIVE",
          requestId: `${requestPrefix}:archive`,
          source: "BACKOFFICE",
        }),
      ]);
      expect(revisions.every(({ reason }) => reason?.trim())).toBe(true);
    } finally {
      if (createdPlacementId) {
        await client.database
          .delete(sponsorshipPlacements)
          .where(eq(sponsorshipPlacements.id, createdPlacementId));
      }
      await client.database
        .delete(mediaAssets)
        .where(inArray(mediaAssets.id, [activeAssetId, pendingAssetId]));
    }
  });

  it("keeps a predecessor active while another non-archived placement references it", async () => {
    const sharedAssetId = crypto.randomUUID();
    const replacementAssetId = crypto.randomUUID();
    const requestPrefix = crypto.randomUUID();
    const placementIds: string[] = [];
    const service = createService();

    try {
      await client.database.insert(mediaAssets).values([
        {
          bucketName: "sponsorship-media",
          height: 720,
          id: sharedAssetId,
          kind: "SPONSORSHIP_CREATIVE",
          mimeType: "image/webp",
          objectPath: `integration/${sharedAssetId}.webp`,
          ownerAccountId: seedAdmin.accountId,
          sizeBytes: 1_024,
          status: "ACTIVE",
          width: 1_280,
        },
        {
          bucketName: "sponsorship-media",
          height: 720,
          id: replacementAssetId,
          kind: "SPONSORSHIP_CREATIVE",
          mimeType: "image/webp",
          objectPath: `integration/${replacementAssetId}.webp`,
          ownerAccountId: seedAdmin.accountId,
          sizeBytes: 1_024,
          status: "PENDING",
          width: 1_280,
        },
      ]);

      const placementInput = {
        advertiserAccountId: null,
        advertiserLabel: "Marca com mídia compartilhada",
        audience: "ALL" as const,
        body: "Criativo compartilhado para teste local.",
        creativeAssetId: sharedAssetId,
        endsAt: new Date("2030-01-31T23:59:59.000Z"),
        featuredCreatorProfileId: null,
        linkLabel: "Conhecer",
        linkUrl: "https://example.test/compartilhado",
        placementType: "TOP_BANNER" as const,
        slotKey: "integration-shared",
        sortOrder: 30,
        startsAt: new Date("2020-01-01T00:00:00.000Z"),
        title: "Campanha compartilhada",
      };
      const first = await service.create({
        placement: placementInput,
        reason: "Cadastrar primeiro uso do criativo compartilhado",
        requestId: `${requestPrefix}:create-first`,
      });
      placementIds.push(first.id);
      const sibling = await service.create({
        placement: {
          ...placementInput,
          slotKey: "integration-shared-sibling",
          sortOrder: 40,
        },
        reason: "Cadastrar segundo uso do criativo compartilhado",
        requestId: `${requestPrefix}:create-sibling`,
      });
      placementIds.push(sibling.id);

      const updated = await service.update({
        expectedVersion: first.version,
        patch: { creativeAssetId: replacementAssetId },
        placementId: first.id,
        reason: "Substituir criativo sem afetar placement irmão",
        requestId: `${requestPrefix}:replace`,
      });
      const activated = await service.activate({
        expectedVersion: updated.version,
        placementId: first.id,
        reason: "Ativar substituição mantendo uso compartilhado",
        requestId: `${requestPrefix}:activate`,
      });

      expect(activated).toMatchObject({
        creativeAssetId: replacementAssetId,
        isActive: true,
      });

      const retainedAssets = await client.database
        .select({
          archivedAt: mediaAssets.archivedAt,
          id: mediaAssets.id,
          replacedByAssetId: mediaAssets.replacedByAssetId,
          status: mediaAssets.status,
          version: mediaAssets.version,
        })
        .from(mediaAssets)
        .where(inArray(mediaAssets.id, [sharedAssetId, replacementAssetId]));

      expect(retainedAssets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            archivedAt: null,
            id: sharedAssetId,
            replacedByAssetId: null,
            status: "ACTIVE",
            version: 1,
          }),
          expect.objectContaining({
            archivedAt: null,
            id: replacementAssetId,
            status: "ACTIVE",
            version: 2,
          }),
        ]),
      );
    } finally {
      if (placementIds.length > 0) {
        await client.database
          .delete(sponsorshipPlacements)
          .where(inArray(sponsorshipPlacements.id, placementIds));
      }
      await client.database
        .delete(mediaAssets)
        .where(inArray(mediaAssets.id, [sharedAssetId, replacementAssetId]));
    }
  });
});

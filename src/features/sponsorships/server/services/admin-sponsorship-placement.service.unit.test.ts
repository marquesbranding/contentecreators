import { describe, expect, it, vi } from "vitest";

import {
  AccountAccessError,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import type {
  AdminSponsorshipPlacementRepository,
  SponsorshipActivationEvidence,
  SponsorshipPlacementCreateData,
  SponsorshipPlacementRecord,
} from "../repositories/sponsorship-placement.repository";
import {
  createAdminSponsorshipPlacementService,
  SponsorshipPlacementServiceError,
} from "./admin-sponsorship-placement.service";

const placementId = "10000000-0000-4000-8000-000000000001";
const assetId = "20000000-0000-4000-8000-000000000001";
const replacementAssetId = "20000000-0000-4000-8000-000000000002";
const creatorProfileId = "30000000-0000-4000-8000-000000000001";
const adminAccountId = "a0000000-0000-4000-8000-000000000001";
const validatedCreativeMetadata = {
  height: 720,
  mimeType: "image/webp",
  sizeBytes: 1_024,
  width: 1_280,
} as const;

const placement: SponsorshipPlacementRecord = {
  advertiserAccountId: null,
  advertiserLabel: "Marca parceira",
  archivedAt: null,
  audience: "COMPANY",
  body: "Conheça a nova coleção.",
  creativeAssetId: assetId,
  createdAt: new Date("2026-07-28T12:00:00.000Z"),
  endsAt: new Date("2026-08-31T23:59:59.000Z"),
  featuredCreatorProfileId: null,
  id: placementId,
  isActive: false,
  linkLabel: "Conhecer",
  linkUrl: "https://example.test/colecao",
  placementType: "TOP_BANNER",
  slotKey: "catalog-top",
  sortOrder: 10,
  startsAt: new Date("2026-08-01T00:00:00.000Z"),
  title: "Nova coleção",
  updatedAt: new Date("2026-07-28T12:00:00.000Z"),
  version: 1,
};

const createPlacementData: Omit<SponsorshipPlacementCreateData, "isActive"> = {
  advertiserAccountId: null,
  advertiserLabel: "Marca parceira",
  audience: "COMPANY",
  body: "Conheça a nova coleção.",
  creativeAssetId: assetId,
  endsAt: new Date("2026-08-31T23:59:59.000Z"),
  featuredCreatorProfileId: null,
  linkLabel: "Conhecer",
  linkUrl: "https://example.test/colecao",
  placementType: "TOP_BANNER",
  slotKey: "catalog-top",
  sortOrder: 10,
  startsAt: new Date("2026-08-01T00:00:00.000Z"),
  title: "Nova coleção",
};

const activationEvidence: SponsorshipActivationEvidence = {
  featuredCreator: null,
  media: {
    ...validatedCreativeMetadata,
    archivedAt: null,
    bucketName: "sponsorship-media",
    id: assetId,
    kind: "SPONSORSHIP_CREATIVE",
    ownerAccountId: adminAccountId,
    ownerAccountRole: "ADMIN",
    status: "ACTIVE",
  },
  placement,
};

function createRunner(role: "ADMIN" | "COMPANY" = "ADMIN") {
  const transaction = {
    execute: vi.fn(async () => []),
  };
  const runner = vi.fn(async (_input, work) =>
    work(transaction as never, {
      accountId: adminAccountId,
      authUserId: "b0000000-0000-4000-8000-000000000001",
      role,
      status: "APPROVED",
    }),
  ) as unknown as VerifiedAccountTransactionRunner;

  return { runner, transaction };
}

function createRepository(
  overrides: Partial<AdminSponsorshipPlacementRepository> = {},
): AdminSponsorshipPlacementRepository {
  return {
    archiveReplacedCreativeIfUnreferenced: vi.fn(async () => true),
    archive: vi.fn(async () => ({
      ...placement,
      archivedAt: new Date(),
      version: 2,
    })),
    create: vi.fn(async () => placement),
    findActivationEvidence: vi.fn(async () => activationEvidence),
    findById: vi.fn(async () => placement),
    list: vi.fn(async () => ({
      items: [placement],
      page: 1,
      pageSize: 20,
      totalItems: 1,
    })),
    promotePendingCreative: vi.fn(
      async () =>
        ({
          ...validatedCreativeMetadata,
          archivedAt: null,
          bucketName: "sponsorship-media",
          id: assetId,
          kind: "SPONSORSHIP_CREATIVE",
          ownerAccountId: adminAccountId,
          ownerAccountRole: "ADMIN",
          status: "ACTIVE",
        }) satisfies SponsorshipActivationEvidence["media"],
    ),
    reorder: vi.fn(async () => [{ ...placement, sortOrder: 1, version: 2 }]),
    setActive: vi.fn(async (_transaction, _id, _version, isActive) => ({
      ...placement,
      isActive,
      version: 2,
    })),
    update: vi.fn(async () => ({
      ...placement,
      title: "Atualizado",
      version: 2,
    })),
    ...overrides,
  };
}

describe("admin sponsorship placement service", () => {
  it("reauthorizes ADMIN before every read and mutation", async () => {
    const repository = createRepository();
    const { runner } = createRunner("COMPANY");
    const service = createAdminSponsorshipPlacementService({
      repository,
      runVerifiedTransaction: runner,
    });

    await expect(
      service.get({ placementId, requestId: "sponsor-get-request" }),
    ).rejects.toEqual(new AccountAccessError("ROLE_FORBIDDEN"));
    await expect(
      service.create({
        placement: createPlacementData,
        reason: "Cadastrar novo espaço patrocinado",
        requestId: "sponsor-create-request",
      }),
    ).rejects.toEqual(new AccountAccessError("ROLE_FORBIDDEN"));
    await expect(
      service.list({
        page: 1,
        pageSize: 20,
        requestId: "sponsor-list-request",
      }),
    ).rejects.toEqual(new AccountAccessError("ROLE_FORBIDDEN"));
    await expect(
      service.activate({
        expectedVersion: 1,
        placementId,
        reason: "Ativar placement por solicitação operacional",
        requestId: "sponsor-activate-request",
      }),
    ).rejects.toEqual(new AccountAccessError("ROLE_FORBIDDEN"));
    await expect(
      service.deactivate({
        expectedVersion: 1,
        placementId,
        reason: "Desativar placement por solicitação operacional",
        requestId: "sponsor-deactivate-request",
      }),
    ).rejects.toEqual(new AccountAccessError("ROLE_FORBIDDEN"));
    await expect(
      service.update({
        expectedVersion: 1,
        patch: { title: "Alteração bloqueada" },
        placementId,
        reason: "Atualizar placement por solicitação operacional",
        requestId: "sponsor-update-request",
      }),
    ).rejects.toEqual(new AccountAccessError("ROLE_FORBIDDEN"));
    await expect(
      service.reorder({
        items: [{ expectedVersion: 1, placementId, sortOrder: 1 }],
        reason: "Reordenar placement por solicitação operacional",
        requestId: "sponsor-reorder-request",
      }),
    ).rejects.toEqual(new AccountAccessError("ROLE_FORBIDDEN"));
    await expect(
      service.archive({
        expectedVersion: 1,
        placementId,
        reason: "Arquivar placement por solicitação operacional",
        requestId: "sponsor-archive-request",
      }),
    ).rejects.toEqual(new AccountAccessError("ROLE_FORBIDDEN"));
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.list).not.toHaveBeenCalled();
    expect(repository.findActivationEvidence).not.toHaveBeenCalled();
    expect(repository.promotePendingCreative).not.toHaveBeenCalled();
    expect(repository.setActive).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.reorder).not.toHaveBeenCalled();
    expect(repository.archive).not.toHaveBeenCalled();
  });

  it("requires a meaningful human reason for privileged mutations", async () => {
    const repository = createRepository();
    const service = createAdminSponsorshipPlacementService({
      repository,
      runVerifiedTransaction: createRunner().runner,
    });

    await expect(
      service.archive({
        expectedVersion: 1,
        placementId,
        reason: "ok",
        requestId: "sponsor-archive-request",
      }),
    ).rejects.toEqual(new SponsorshipPlacementServiceError("INVALID_REASON"));
    expect(repository.archive).not.toHaveBeenCalled();
  });

  it("creates an inactive placement inside verified audit context", async () => {
    const repository = createRepository();
    const { runner, transaction } = createRunner();
    const service = createAdminSponsorshipPlacementService({
      repository,
      runVerifiedTransaction: runner,
    });

    const result = await service.create({
      placement: createPlacementData,
      reason: "Cadastrar novo espaço patrocinado",
      requestId: "sponsor-create-request",
    });

    expect(result).toEqual(placement);
    expect(transaction.execute).toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ isActive: false }),
    );
  });

  it("detects stale expectedVersion before attempting an update", async () => {
    const repository = createRepository({
      update: vi.fn(async () => {
        throw new SponsorshipPlacementServiceError("VERSION_CONFLICT");
      }),
    });
    const service = createAdminSponsorshipPlacementService({
      repository,
      runVerifiedTransaction: createRunner().runner,
    });

    await expect(
      service.update({
        expectedVersion: 7,
        patch: { title: "Atualizado" },
        placementId,
        reason: "Atualizar texto da campanha",
        requestId: "sponsor-update-request",
      }),
    ).rejects.toEqual(new SponsorshipPlacementServiceError("VERSION_CONFLICT"));
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("archives an unreferenced predecessor after validating a replacement creative", async () => {
    const updatedPlacement = {
      ...placement,
      creativeAssetId: replacementAssetId,
      version: 2,
    };
    const repository = createRepository({
      findActivationEvidence: vi.fn(
        async () =>
          ({
            featuredCreator: null,
            media: {
              ...validatedCreativeMetadata,
              archivedAt: null,
              bucketName: "sponsorship-media",
              id: replacementAssetId,
              kind: "SPONSORSHIP_CREATIVE",
              ownerAccountId: adminAccountId,
              ownerAccountRole: "ADMIN",
              status: "PENDING",
            },
            placement: updatedPlacement,
          }) satisfies SponsorshipActivationEvidence,
      ),
      update: vi.fn(async () => updatedPlacement),
    });
    const service = createAdminSponsorshipPlacementService({
      repository,
      runVerifiedTransaction: createRunner().runner,
    });

    await expect(
      service.update({
        expectedVersion: 1,
        patch: { creativeAssetId: replacementAssetId },
        placementId,
        reason: "Substituir criativo por upload validado",
        requestId: "sponsor-replace-creative",
      }),
    ).resolves.toEqual(updatedPlacement);

    expect(
      repository.archiveReplacedCreativeIfUnreferenced,
    ).toHaveBeenCalledWith(expect.anything(), assetId, replacementAssetId);
  });

  it("rolls back an update that would leave an active placement invalid", async () => {
    const activePlacement = {
      ...placement,
      isActive: true,
    };
    const repository = createRepository({
      findActivationEvidence: vi.fn(async () => ({
        featuredCreator: null,
        media: null,
        placement: {
          ...activePlacement,
          creativeAssetId: null,
          title: null,
          version: 2,
        },
      })),
      findById: vi.fn(async () => activePlacement),
      update: vi.fn(async () => ({
        ...activePlacement,
        creativeAssetId: null,
        title: null,
        version: 2,
      })),
    });
    const service = createAdminSponsorshipPlacementService({
      repository,
      runVerifiedTransaction: createRunner().runner,
    });

    await expect(
      service.update({
        expectedVersion: 1,
        patch: { creativeAssetId: null, title: null },
        placementId,
        reason: "Remover criativo da campanha ainda ativa",
        requestId: "sponsor-update-active-invalid",
      }),
    ).rejects.toEqual(
      new SponsorshipPlacementServiceError("INVALID_ACTIVATION"),
    );
    expect(repository.update).toHaveBeenCalled();
    expect(repository.findActivationEvidence).toHaveBeenCalled();
  });

  it("validates private media and featured creator eligibility before activation", async () => {
    const featuredPlacement = {
      ...placement,
      creativeAssetId: null,
      featuredCreatorProfileId: creatorProfileId,
      placementType: "FEATURED_CREATOR" as const,
    };
    const repository = createRepository({
      findActivationEvidence: vi.fn(
        async () =>
          ({
            featuredCreator: {
              accountArchivedAt: null,
              accountStatus: "APPROVED",
              completionPercentage: 100,
              profileArchivedAt: null,
              profileId: creatorProfileId,
            },
            media: null,
            placement: featuredPlacement,
          }) satisfies SponsorshipActivationEvidence,
      ),
      setActive: vi.fn(async () => ({
        ...featuredPlacement,
        isActive: true,
        version: 2,
      })),
    });
    const service = createAdminSponsorshipPlacementService({
      repository,
      runVerifiedTransaction: createRunner().runner,
    });

    await expect(
      service.activate({
        expectedVersion: 1,
        placementId,
        reason: "Ativar creator em destaque aprovado",
        requestId: "sponsor-activate-request",
      }),
    ).resolves.toMatchObject({ isActive: true });
    expect(repository.setActive).toHaveBeenCalledWith(
      expect.anything(),
      placementId,
      1,
      true,
    );
  });

  it("promotes the current ADMIN's validated pending sponsorship creative before activation", async () => {
    const pendingMedia = {
      ...validatedCreativeMetadata,
      archivedAt: null,
      bucketName: "sponsorship-media",
      id: assetId,
      kind: "SPONSORSHIP_CREATIVE",
      ownerAccountId: adminAccountId,
      ownerAccountRole: "ADMIN",
      status: "PENDING",
    } as const;
    const repository = createRepository({
      findActivationEvidence: vi.fn(async () => ({
        featuredCreator: null,
        media: pendingMedia,
        placement,
      })),
    });
    const service = createAdminSponsorshipPlacementService({
      repository,
      runVerifiedTransaction: createRunner().runner,
    });

    await expect(
      service.activate({
        expectedVersion: 1,
        placementId,
        reason: "Ativar campanha com upload validado",
        requestId: "sponsor-promote-pending-media",
      }),
    ).resolves.toMatchObject({ isActive: true });

    expect(repository.promotePendingCreative).toHaveBeenCalledWith(
      expect.anything(),
      assetId,
      adminAccountId,
    );
    expect(repository.setActive).toHaveBeenCalled();
    expect(
      vi.mocked(repository.promotePendingCreative).mock.invocationCallOrder[0],
    ).toBeLessThan(
      vi.mocked(repository.setActive).mock.invocationCallOrder[0]!,
    );
  });

  it("does not promote a pending creative owned by another ADMIN", async () => {
    const repository = createRepository({
      findActivationEvidence: vi.fn(
        async () =>
          ({
            featuredCreator: null,
            media: {
              ...validatedCreativeMetadata,
              archivedAt: null,
              bucketName: "sponsorship-media",
              id: assetId,
              kind: "SPONSORSHIP_CREATIVE",
              ownerAccountId: "a0000000-0000-4000-8000-000000000099",
              ownerAccountRole: "ADMIN",
              status: "PENDING",
            },
            placement,
          }) satisfies SponsorshipActivationEvidence,
      ),
    });
    const service = createAdminSponsorshipPlacementService({
      repository,
      runVerifiedTransaction: createRunner().runner,
    });

    await expect(
      service.activate({
        expectedVersion: 1,
        placementId,
        reason: "Tentar ativar mídia de outro administrador",
        requestId: "sponsor-deny-foreign-pending-media",
      }),
    ).rejects.toEqual(
      new SponsorshipPlacementServiceError("INVALID_ACTIVATION"),
    );
    expect(repository.promotePendingCreative).not.toHaveBeenCalled();
    expect(repository.setActive).not.toHaveBeenCalled();
  });

  it("does not promote pending creative metadata without validated dimensions", async () => {
    const repository = createRepository({
      findActivationEvidence: vi.fn(
        async () =>
          ({
            featuredCreator: null,
            media: {
              ...validatedCreativeMetadata,
              archivedAt: null,
              bucketName: "sponsorship-media",
              height: null,
              id: assetId,
              kind: "SPONSORSHIP_CREATIVE",
              ownerAccountId: adminAccountId,
              ownerAccountRole: "ADMIN",
              status: "PENDING",
            },
            placement,
          }) satisfies SponsorshipActivationEvidence,
      ),
    });
    const service = createAdminSponsorshipPlacementService({
      repository,
      runVerifiedTransaction: createRunner().runner,
    });

    await expect(
      service.activate({
        expectedVersion: 1,
        placementId,
        reason: "Tentar ativar criativo sem dimensões validadas",
        requestId: "sponsor-deny-invalid-dimensions",
      }),
    ).rejects.toEqual(
      new SponsorshipPlacementServiceError("INVALID_ACTIVATION"),
    );
    expect(repository.promotePendingCreative).not.toHaveBeenCalled();
    expect(repository.setActive).not.toHaveBeenCalled();
  });

  it("keeps the placement inactive when pending media promotion loses eligibility", async () => {
    const repository = createRepository({
      findActivationEvidence: vi.fn(
        async () =>
          ({
            featuredCreator: null,
            media: {
              ...validatedCreativeMetadata,
              archivedAt: null,
              bucketName: "sponsorship-media",
              id: assetId,
              kind: "SPONSORSHIP_CREATIVE",
              ownerAccountId: adminAccountId,
              ownerAccountRole: "ADMIN",
              status: "PENDING",
            },
            placement,
          }) satisfies SponsorshipActivationEvidence,
      ),
      promotePendingCreative: vi.fn(async () => null),
    });
    const service = createAdminSponsorshipPlacementService({
      repository,
      runVerifiedTransaction: createRunner().runner,
    });

    await expect(
      service.activate({
        expectedVersion: 1,
        placementId,
        reason: "Ativar upload que perdeu elegibilidade",
        requestId: "sponsor-pending-media-conflict",
      }),
    ).rejects.toEqual(
      new SponsorshipPlacementServiceError("INVALID_ACTIVATION"),
    );
    expect(repository.setActive).not.toHaveBeenCalled();
  });

  it("rejects activation when sponsorship media is not private and active", async () => {
    const repository = createRepository({
      findActivationEvidence: vi.fn(
        async () =>
          ({
            featuredCreator: null,
            media: {
              ...validatedCreativeMetadata,
              archivedAt: null,
              bucketName: "profile-media",
              id: assetId,
              kind: "AVATAR",
              ownerAccountId: adminAccountId,
              ownerAccountRole: "INFLUENCER",
              status: "ACTIVE",
            },
            placement,
          }) satisfies SponsorshipActivationEvidence,
      ),
    });
    const service = createAdminSponsorshipPlacementService({
      repository,
      runVerifiedTransaction: createRunner().runner,
    });

    await expect(
      service.activate({
        expectedVersion: 1,
        placementId,
        reason: "Ativar campanha patrocinada válida",
        requestId: "sponsor-invalid-media",
      }),
    ).rejects.toEqual(
      new SponsorshipPlacementServiceError("INVALID_ACTIVATION"),
    );
    expect(repository.setActive).not.toHaveBeenCalled();
  });

  it("deactivates, reorders, and soft-archives through optimistic writes", async () => {
    const repository = createRepository();
    const service = createAdminSponsorshipPlacementService({
      repository,
      runVerifiedTransaction: createRunner().runner,
    });

    await service.deactivate({
      expectedVersion: 1,
      placementId,
      reason: "Pausar campanha por solicitação operacional",
      requestId: "sponsor-deactivate-request",
    });
    await service.reorder({
      items: [{ expectedVersion: 1, placementId, sortOrder: 1 }],
      reason: "Reorganizar prioridade do carrossel patrocinado",
      requestId: "sponsor-reorder-request",
    });
    const archived = await service.archive({
      expectedVersion: 1,
      placementId,
      reason: "Remover campanha encerrada do backoffice",
      requestId: "sponsor-archive-request",
    });

    expect(repository.setActive).toHaveBeenCalledWith(
      expect.anything(),
      placementId,
      1,
      false,
    );
    expect(repository.reorder).toHaveBeenCalled();
    expect(archived.archivedAt).toBeInstanceOf(Date);
    expect(repository.archive).toHaveBeenCalledWith(
      expect.anything(),
      placementId,
      1,
    );
  });
});

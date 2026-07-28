import { describe, expect, it, vi } from "vitest";

import type { SponsorshipPlacementRecord } from "../repositories/sponsorship-placement.repository";
import { createSponsorshipManagementViewService } from "./sponsorship-management-view.service";

const placement: SponsorshipPlacementRecord = {
  advertiserAccountId: null,
  advertiserLabel: "Marca parceira",
  archivedAt: null,
  audience: "COMPANY",
  body: "Conteúdo de apoio.",
  creativeAssetId: "20000000-0000-4000-8000-000000000001",
  createdAt: new Date("2026-07-28T12:00:00.000Z"),
  endsAt: new Date("2026-08-31T23:59:59.000Z"),
  featuredCreatorProfileId: null,
  id: "10000000-0000-4000-8000-000000000001",
  isActive: true,
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

function createAdminService() {
  return {
    activate: vi.fn(async () => ({ ...placement, version: 2 })),
    archive: vi.fn(async () => ({
      ...placement,
      archivedAt: new Date("2026-07-28T13:00:00.000Z"),
      version: 2,
    })),
    create: vi.fn(async () => ({ ...placement, isActive: false })),
    deactivate: vi.fn(async () => ({
      ...placement,
      isActive: false,
      version: 2,
    })),
    get: vi.fn(),
    list: vi.fn(async () => ({
      items: [placement],
      page: 1,
      pageSize: 20,
      totalItems: 1,
    })),
    reorder: vi.fn(async () => [{ ...placement, sortOrder: 20, version: 2 }]),
    update: vi.fn(async () => ({
      ...placement,
      title: "Título atualizado",
      version: 2,
    })),
  };
}

describe("sponsorship management view service", () => {
  it("maps raw records to safe admin DTOs with signed private media", async () => {
    const adminService = createAdminService();
    const service = createSponsorshipManagementViewService({
      adminService,
      getSignedMedia: vi.fn(async () => ({
        height: 900,
        url: "https://signed.example.test/creative",
        width: 1600,
      })),
      now: () => new Date("2026-08-10T12:00:00.000Z"),
    });

    await expect(
      service.list(
        {
          audience: "COMPANY",
          page: 1,
          pageSize: 20,
          search: "",
          type: "TOP_BANNER",
        },
        "sponsorship-list-request",
      ),
    ).resolves.toEqual({
      items: [
        expect.objectContaining({
          creative: {
            alt: "Nova coleção — Marca parceira",
            height: 900,
            url: "https://signed.example.test/creative",
            width: 1600,
          },
          creativeAssetId: placement.creativeAssetId,
          state: "ACTIVE",
        }),
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      },
    });
  });

  it("creates drafts and keeps activation as a separate command", async () => {
    const adminService = createAdminService();
    const service = createSponsorshipManagementViewService({
      adminService,
      getSignedMedia: vi.fn(async () => null),
      now: () => new Date("2026-08-10T12:00:00.000Z"),
    });

    await service.create(
      {
        advertiserLabel: "Marca parceira",
        audience: "COMPANY",
        body: "Conteúdo de apoio.",
        creativeAssetId: null,
        endsAt: null,
        featuredCreatorProfileId: null,
        isActive: false,
        linkLabel: null,
        linkUrl: null,
        placementType: "TOP_BANNER",
        reason: "Cadastrar placement em rascunho.",
        slotKey: "catalog-top",
        sortOrder: 10,
        startsAt: null,
        title: "Nova coleção",
      },
      "sponsorship-create-request",
    );

    expect(adminService.create).toHaveBeenCalledWith({
      placement: expect.objectContaining({
        advertiserAccountId: null,
      }),
      reason: "Cadastrar placement em rascunho.",
      requestId: "sponsorship-create-request",
    });
    expect(adminService.activate).not.toHaveBeenCalled();
  });
});

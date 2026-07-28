import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";

import {
  createSponsorshipPlacement,
  fetchSponsorshipPlacements,
  mutateSponsorshipPlacement,
  sponsorshipManagementKeys,
  updateSponsorshipPlacement,
} from "./sponsorship-management.api";

const placement = {
  activationIssues: [],
  advertiserLabel: "Marca parceira",
  archivedAt: null,
  audience: "COMPANY",
  body: "Conheça este destaque.",
  creative: null,
  creativeAssetId: null,
  endsAt: null,
  featuredCreatorName: null,
  featuredCreatorProfileId: null,
  id: "f6000000-0000-4000-8000-000000000002",
  isActive: false,
  linkLabel: "Saiba mais",
  linkUrl: "https://example.com",
  placementType: "TOP_BANNER",
  slotKey: "catalog-top",
  sortOrder: 20,
  startsAt: null,
  state: "DRAFT",
  title: "Banner em rascunho",
  updatedAt: "2026-07-28T12:00:00.000Z",
  version: 1,
} as const;

const response = {
  items: [placement],
  pagination: {
    page: 1,
    pageSize: 20,
    totalItems: 1,
    totalPages: 1,
  },
} as const;

describe("sponsorship management browser API", () => {
  it("normalizes list keys and forwards cancellation", async () => {
    expect(sponsorshipManagementKeys.list({ search: "  Banner " })).toEqual(
      sponsorshipManagementKeys.list({
        page: 1,
        pageSize: 20,
        search: "Banner",
      }),
    );

    const signal = new AbortController().signal;
    const get = vi.fn().mockResolvedValue({ data: response });
    const client = { get } as unknown as AxiosInstance;

    await expect(
      fetchSponsorshipPlacements(
        {
          audience: "COMPANY",
          search: "Banner",
          state: "DRAFT",
          type: "TOP_BANNER",
        },
        signal,
        client,
      ),
    ).resolves.toEqual(response);

    expect(get).toHaveBeenCalledWith(
      "/backoffice/sponsorships?type=TOP_BANNER&audience=COMPANY&state=DRAFT&search=Banner&page=1&pageSize=20",
      { signal },
    );
  });

  it("uses typed create, update and command endpoints", async () => {
    const post = vi.fn().mockResolvedValue({ data: { placement } });
    const patch = vi.fn().mockResolvedValue({ data: { placement } });
    const client = { patch, post } as unknown as AxiosInstance;
    const write = {
      advertiserLabel: "Marca parceira",
      audience: "COMPANY",
      body: "Conheça este destaque.",
      creativeAssetId: null,
      endsAt: null,
      featuredCreatorProfileId: null,
      isActive: false,
      linkLabel: "Saiba mais",
      linkUrl: "https://example.com",
      placementType: "TOP_BANNER",
      reason: "Cadastro inicial do patrocínio.",
      slotKey: "catalog-top",
      sortOrder: 20,
      startsAt: null,
      title: "Banner em rascunho",
    } as const;

    await createSponsorshipPlacement(write, client);
    await updateSponsorshipPlacement(
      placement.id,
      { ...write, expectedVersion: 1 },
      client,
    );
    await mutateSponsorshipPlacement(
      placement.id,
      {
        action: "REORDER",
        expectedVersion: 1,
        reason: "Ajuste da ordem de exibição.",
        sortOrder: 10,
      },
      client,
    );

    expect(post).toHaveBeenNthCalledWith(1, "/backoffice/sponsorships", write);
    expect(patch).toHaveBeenNthCalledWith(
      1,
      `/backoffice/sponsorships/${placement.id}`,
      { ...write, expectedVersion: 1 },
    );
    expect(post).toHaveBeenNthCalledWith(
      2,
      `/backoffice/sponsorships/${placement.id}/commands`,
      {
        action: "REORDER",
        expectedVersion: 1,
        reason: "Ajuste da ordem de exibição.",
        sortOrder: 10,
      },
    );
  });
});

import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";

import { HttpClientError } from "@/shared/api/http-client";

import { catalogDetailKeys, fetchCatalogDetail } from "./catalog-detail.api";

const creatorId = "10000000-0000-4000-8000-000000000001";
const response = {
  bio: "Conteúdo.",
  contact: { reason: "VIEWER_NOT_COMPANY", status: "UNAVAILABLE" },
  creatorId,
  creatorType: "INFLUENCER",
  displayName: "Creator",
  location: { city: "Recife", state: "PE" },
  media: { avatar: null, cover: null },
  metrics: [],
  niches: [],
  socialProfiles: [],
  whatsappContactCount: 0,
} as const;

describe("catalog detail browser API", () => {
  it("uses a stable creator-specific key and forwards cancellation", async () => {
    const signal = new AbortController().signal;
    const get = vi.fn().mockResolvedValue({ data: response });
    const client = { get } as unknown as AxiosInstance;

    await expect(
      fetchCatalogDetail(creatorId, signal, client),
    ).resolves.toEqual(response);
    expect(catalogDetailKeys.detail(creatorId)).toEqual([
      "catalog",
      "creator-detail",
      creatorId,
    ]);
    expect(get).toHaveBeenCalledWith(`/catalog/creators/${creatorId}`, {
      signal,
    });
  });

  it.each([
    ["UNAUTHORIZED", 401],
    ["FORBIDDEN", 403],
    ["REQUEST_ERROR", 404],
  ] as const)(
    "clears protected data for %s eligibility responses",
    async (code, status) => {
      const client = {
        get: vi.fn().mockRejectedValue(
          new HttpClientError({
            code,
            message: "safe",
            status,
          }),
        ),
      } as unknown as AxiosInstance;

      await expect(
        fetchCatalogDetail(creatorId, new AbortController().signal, client),
      ).resolves.toBeNull();
    },
  );
});

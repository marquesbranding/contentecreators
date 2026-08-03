import { describe, expect, it, vi } from "vitest";

import { fetchPublicCommunityProof } from "./public-community-proof.api";

describe("public community proof API", () => {
  it("accepts a bounded public response without credentials", async () => {
    const request = vi.fn(async () => ({
      json: async () => ({
        companies: [
          {
            city: null,
            companyId: "company-1",
            segment: "Moda",
            state: null,
            tradeName: "Marca Beta",
          },
        ],
        creators: [
          {
            bioExcerpt: "Resumo publico",
            city: "Joacaba",
            creatorId: "creator-1",
            creatorType: "INFLUENCER",
            displayName: "Creator Beta",
            metric: {
              engagementRate: 8,
              followerCount: 10000,
              platform: "INSTAGRAM",
            },
            niches: [{ name: "Moda", slug: "moda" }],
            state: "SC",
          },
        ],
      }),
      ok: true,
    }));
    const controller = new AbortController();

    await expect(
      fetchPublicCommunityProof(controller.signal, request),
    ).resolves.toEqual({
      companies: [
        {
          city: null,
          companyId: "company-1",
          segment: "Moda",
          state: null,
          tradeName: "Marca Beta",
        },
      ],
      creators: [
        {
          bioExcerpt: "Resumo publico",
          city: "Joacaba",
          creatorId: "creator-1",
          creatorType: "INFLUENCER",
          displayName: "Creator Beta",
          metric: {
            engagementRate: 8,
            followerCount: 10000,
            platform: "INSTAGRAM",
          },
          niches: [{ name: "Moda", slug: "moda" }],
          state: "SC",
        },
      ],
    });
    expect(request).toHaveBeenCalledWith(
      "/api/public/marketing/community-proof",
      expect.objectContaining({
        credentials: "omit",
        signal: controller.signal,
      }),
    );
  });

  it.each([
    ["transport failure", vi.fn().mockRejectedValue(new Error("offline"))],
    [
      "invalid payload",
      vi.fn(async () => ({
        json: async () => ({
          companies: [],
          creators: [
            {
              creatorId: "creator-1",
              creatorType: "INFLUENCER",
              displayName: "Creator Beta",
              email: "private@example.test",
            },
          ],
        }),
        ok: true,
      })),
    ],
    [
      "non-success response",
      vi.fn(async () => ({ json: async () => null, ok: false })),
    ],
  ])("fails closed for %s", async (_case, request) => {
    await expect(
      fetchPublicCommunityProof(new AbortController().signal, request),
    ).resolves.toBeNull();
  });
});

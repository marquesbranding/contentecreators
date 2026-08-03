import { describe, expect, it } from "vitest";

import { createPublicCommunityProofService } from "./public-community-proof.service";

describe("public community proof service", () => {
  it("returns proof when approved creators or companies are available", async () => {
    const service = createPublicCommunityProofService({
      loadProof: async () => ({
        companies: [],
        creators: [
          {
            bioExcerpt: null,
            city: null,
            creatorId: "creator-1",
            creatorType: "UGC",
            displayName: "Creator Beta",
            metric: null,
            niches: [],
            state: null,
          },
        ],
      }),
    });

    await expect(service.load()).resolves.toEqual({
      companies: [],
      creators: [
        {
          bioExcerpt: null,
          city: null,
          creatorId: "creator-1",
          creatorType: "UGC",
          displayName: "Creator Beta",
          metric: null,
          niches: [],
          state: null,
        },
      ],
    });
  });

  it("omits the section when the database has no public proof", async () => {
    const service = createPublicCommunityProofService({
      loadProof: async () => ({
        companies: [],
        creators: [],
      }),
    });

    await expect(service.load()).resolves.toBeNull();
  });

  it("fails closed when loading proof fails", async () => {
    const service = createPublicCommunityProofService({
      loadProof: async () => {
        throw new Error("database unavailable");
      },
    });

    await expect(service.load()).resolves.toBeNull();
  });
});

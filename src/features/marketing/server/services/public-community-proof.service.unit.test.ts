import { describe, expect, it, vi } from "vitest";

import type { PublicCommunityCreatorSource } from "../../types/public-community-proof.types";
import { createPublicCommunityProofService } from "./public-community-proof.service";

const creatorSource: PublicCommunityCreatorSource = {
  avatarSource: null,
  bioExcerpt: null,
  city: null,
  creatorId: "creator-1",
  creatorType: "UGC",
  displayName: "Creator Beta",
  metric: null,
  niches: [],
  state: null,
};

const featuredCreatorSource: PublicCommunityCreatorSource = {
  ...creatorSource,
  avatarSource: {
    bucketName: "profile-media",
    height: 512,
    objectPath: "account-1/avatar.webp",
    width: 512,
  },
};

describe("public community proof service", () => {
  it("returns proof when approved creators or companies are available", async () => {
    const service = createPublicCommunityProofService({
      loadProof: async () => ({ companies: [], creators: [creatorSource] }),
    });

    await expect(service.load()).resolves.toEqual({
      companies: [],
      creators: [
        {
          avatar: null,
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

  it("signs the avatar of a curated creator without leaking storage coordinates", async () => {
    const signAvatar = vi.fn(async () => ({
      height: 512,
      url: "https://project.supabase.co/storage/v1/object/sign/avatar.webp?token=x",
      width: 512,
    }));
    const service = createPublicCommunityProofService({
      loadProof: async () => ({
        companies: [],
        creators: [featuredCreatorSource],
      }),
      signAvatar,
    });

    const proof = await service.load();

    expect(signAvatar).toHaveBeenCalledWith(featuredCreatorSource.avatarSource);
    expect(proof?.creators[0]?.avatar).toEqual({
      height: 512,
      url: "https://project.supabase.co/storage/v1/object/sign/avatar.webp?token=x",
      width: 512,
    });
    expect(proof?.creators[0]).not.toHaveProperty("avatarSource");
  });

  it("keeps the section visible when signing an avatar fails", async () => {
    const service = createPublicCommunityProofService({
      loadProof: async () => ({
        companies: [],
        creators: [featuredCreatorSource],
      }),
      signAvatar: async () => {
        throw new Error("storage unavailable");
      },
    });

    const proof = await service.load();

    expect(proof?.creators).toHaveLength(1);
    expect(proof?.creators[0]?.avatar).toBeNull();
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

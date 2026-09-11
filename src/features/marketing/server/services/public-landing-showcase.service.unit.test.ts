import { describe, expect, it, vi } from "vitest";

import type {
  PublicShowcaseCompanyDto,
  PublicShowcaseCompanySource,
  PublicShowcaseCreatorDto,
  PublicShowcaseCreatorSource,
} from "../../types/public-landing-showcase.types";
import {
  createPublicLandingShowcaseService,
  interleaveShowcase,
} from "./public-landing-showcase.service";

const imageSource = {
  bucketName: "profile-media",
  height: 512,
  objectPath: "owner/avatar.webp",
  width: 512,
};

function creatorSource(id: string): PublicShowcaseCreatorSource {
  return {
    avatarSource: imageSource,
    bioExcerpt: null,
    city: null,
    creatorType: "INFLUENCER",
    displayName: `Creator ${id}`,
    id,
    metric: null,
    niches: [],
    state: null,
  };
}

function companySource(id: string): PublicShowcaseCompanySource {
  return {
    city: null,
    id,
    logoSource: { ...imageSource, objectPath: "owner/logo.png" },
    segment: null,
    state: null,
    tradeName: `Company ${id}`,
  };
}

function creatorDto(id: string): PublicShowcaseCreatorDto {
  return {
    avatar: null,
    bioExcerpt: null,
    city: null,
    creatorType: "INFLUENCER",
    displayName: `Creator ${id}`,
    id,
    kind: "CREATOR",
    metric: null,
    niches: [],
    state: null,
  };
}

function companyDto(id: string): PublicShowcaseCompanyDto {
  return {
    city: null,
    id,
    kind: "COMPANY",
    logo: null,
    segment: null,
    state: null,
    tradeName: `Company ${id}`,
  };
}

describe("public landing showcase service", () => {
  it("alternates creators and companies so neither kind clusters", () => {
    const items = interleaveShowcase(
      [creatorDto("c1"), creatorDto("c2"), creatorDto("c3")],
      [companyDto("k1")],
    );

    expect(items.map((item) => item.id)).toEqual(["c1", "k1", "c2", "c3"]);
  });

  it("signs photos and logos without leaking storage coordinates", async () => {
    const signImage = vi.fn(async (source: typeof imageSource) => ({
      height: source.height,
      url: `https://project.supabase.co/sign/${source.objectPath}`,
      width: source.width,
    }));
    const service = createPublicLandingShowcaseService({
      loadShowcase: async () => ({
        companies: [companySource("k1")],
        creators: [creatorSource("c1")],
      }),
      signImage,
    });

    const showcase = await service.load();

    expect(showcase?.items).toEqual([
      expect.objectContaining({
        avatar: expect.objectContaining({
          url: "https://project.supabase.co/sign/owner/avatar.webp",
        }),
        kind: "CREATOR",
      }),
      expect.objectContaining({
        kind: "COMPANY",
        logo: expect.objectContaining({
          url: "https://project.supabase.co/sign/owner/logo.png",
        }),
      }),
    ]);
    expect(JSON.stringify(showcase)).not.toMatch(
      /objectPath|bucketName|Source/u,
    );
  });

  it("keeps a card on its fallback mark when signing fails", async () => {
    const service = createPublicLandingShowcaseService({
      loadShowcase: async () => ({
        companies: [],
        creators: [creatorSource("c1")],
      }),
      signImage: async () => {
        throw new Error("storage unavailable");
      },
    });

    const showcase = await service.load();

    expect(showcase?.items).toHaveLength(1);
    expect(showcase?.items[0]).toMatchObject({ avatar: null });
  });

  it("answers with an empty list when nobody is enabled yet", async () => {
    const service = createPublicLandingShowcaseService({
      loadShowcase: async () => ({ companies: [], creators: [] }),
    });

    await expect(service.load()).resolves.toEqual({ items: [] });
  });

  it("fails closed when loading fails", async () => {
    const service = createPublicLandingShowcaseService({
      loadShowcase: async () => {
        throw new Error("database unavailable");
      },
    });

    await expect(service.load()).resolves.toBeNull();
  });
});

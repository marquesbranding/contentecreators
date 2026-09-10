import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchPublicCommunityProof } from "./public-community-proof.api";

const supabaseOrigin = "https://project.supabase.co";
const signedAvatarUrl = `${supabaseOrigin}/storage/v1/object/sign/profile-media/a.webp?token=x`;

function creatorPayload(avatar: unknown) {
  return {
    companies: [],
    creators: [
      {
        avatar,
        bioExcerpt: null,
        city: null,
        creatorId: "creator-1",
        creatorType: "INFLUENCER",
        displayName: "Creator Beta",
        metric: null,
        niches: [],
        state: null,
      },
    ],
  };
}

function respondWith(payload: unknown) {
  return vi.fn(async () => ({ json: async () => payload, ok: true }));
}

describe("public community proof API", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

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
            avatar: null,
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
          avatar: null,
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

  it("accepts a signed avatar served by the configured Supabase project", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", supabaseOrigin);

    const proof = await fetchPublicCommunityProof(
      new AbortController().signal,
      respondWith(
        creatorPayload({ height: 512, url: signedAvatarUrl, width: 512 }),
      ),
    );

    expect(proof?.creators[0]?.avatar).toEqual({
      height: 512,
      url: signedAvatarUrl,
      width: 512,
    });
  });

  it.each([
    ["a null avatar", null],
    [
      "a foreign host",
      { height: null, url: "https://evil.test/a.webp", width: null },
    ],
    [
      "plain HTTP against an HTTPS project",
      { height: null, url: "http://project.supabase.co/a.webp", width: null },
    ],
    [
      "a matching host on another port",
      {
        height: null,
        url: "https://project.supabase.co:8443/a.webp",
        width: null,
      },
    ],
    [
      "an undeclared key",
      { height: null, tracker: "1", url: signedAvatarUrl, width: null },
    ],
    ["a non-object", "https://project.supabase.co/a.webp"],
  ])("drops the photo but keeps the creator for %s", async (_case, avatar) => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", supabaseOrigin);

    const proof = await fetchPublicCommunityProof(
      new AbortController().signal,
      respondWith(creatorPayload(avatar)),
    );

    expect(proof?.creators).toHaveLength(1);
    expect(proof?.creators[0]?.avatar).toBeNull();
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

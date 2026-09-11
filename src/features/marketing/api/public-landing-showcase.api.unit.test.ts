import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchPublicLandingShowcase } from "./public-landing-showcase.api";

const supabaseOrigin = "https://project.supabase.co";
const signedUrl = `${supabaseOrigin}/storage/v1/object/sign/profile-media/a.webp?token=x`;

const creator = {
  avatar: { height: 512, url: signedUrl, width: 512 },
  bioExcerpt: "Conteúdo de viagem.",
  city: "Joaçaba",
  creatorType: "UGC",
  displayName: "Gabi Conecta",
  id: "creator-1",
  kind: "CREATOR",
  metric: { engagementRate: 4.2, followerCount: 13500, platform: "INSTAGRAM" },
  niches: [{ name: "Viagem", slug: "viagem" }],
  state: "SC",
};

const company = {
  city: "São Paulo",
  id: "company-1",
  kind: "COMPANY",
  logo: { height: 256, url: signedUrl, width: 256 },
  segment: "Alimentação",
  state: "SP",
  tradeName: "Empresa Quatro",
};

function respondWith(payload: unknown) {
  return vi.fn(async () => ({ json: async () => payload, ok: true }));
}

describe("public landing showcase API", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", supabaseOrigin);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts enabled creators and companies from the dedicated endpoint without credentials", async () => {
    const request = respondWith({ items: [creator, company] });
    const controller = new AbortController();

    await expect(
      fetchPublicLandingShowcase(controller.signal, request),
    ).resolves.toEqual({ items: [creator, company] });
    expect(request).toHaveBeenCalledWith(
      "/api/public/marketing/landing-showcase",
      expect.objectContaining({
        credentials: "omit",
        signal: controller.signal,
      }),
    );
  });

  it("keeps an empty list as a valid nobody-enabled-yet answer", async () => {
    await expect(
      fetchPublicLandingShowcase(
        new AbortController().signal,
        respondWith({ items: [] }),
      ),
    ).resolves.toEqual({ items: [] });
  });

  it("drops an image served from another origin but keeps the card", async () => {
    const proof = await fetchPublicLandingShowcase(
      new AbortController().signal,
      respondWith({
        items: [
          {
            ...company,
            logo: { height: null, url: "https://evil.test/a.png", width: null },
          },
        ],
      }),
    );

    expect(proof?.items).toHaveLength(1);
    expect(proof?.items[0]).toMatchObject({ kind: "COMPANY", logo: null });
  });

  it("drops a card carrying an undeclared field, like contact data", async () => {
    const proof = await fetchPublicLandingShowcase(
      new AbortController().signal,
      respondWith({
        items: [creator, { ...company, whatsappE164: "+5511999999999" }],
      }),
    );

    expect(proof?.items.map((item) => item.kind)).toEqual(["CREATOR"]);
  });

  it.each([
    [
      "every card rejected",
      respondWith({ items: [{ ...company, email: "x@y.test" }] }),
    ],
    [
      "an unknown kind",
      respondWith({ items: [{ ...company, kind: "ADMIN" }] }),
    ],
    ["an undeclared root key", respondWith({ items: [], total: 1 })],
    [
      "a non-success response",
      vi.fn(async () => ({ json: async () => null, ok: false })),
    ],
    ["a transport failure", vi.fn().mockRejectedValue(new Error("offline"))],
  ])("fails closed for %s", async (_case, request) => {
    await expect(
      fetchPublicLandingShowcase(new AbortController().signal, request),
    ).resolves.toBeNull();
  });
});

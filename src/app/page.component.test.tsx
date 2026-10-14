import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Home, { dynamic } from "@/app/page";

vi.mock("next/image", () => ({
  default: ({
    alt,
    priority: _priority,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => {
    void _priority;

    return (
      // The mock verifies the accessible contract without Next.js optimization.
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} {...props} />
    );
  },
}));

vi.mock("@/features/marketing/server", () => ({
  loadPublicSupportContact: () => "privacidade@contentecreators.test",
}));

vi.mock("@/features/sponsorships/server", () => ({
  PublicSponsorshipPromotionSlot: () => {
    throw new Error("The static landing must not query sponsorships");
  },
}));

const banner = (index: number) => ({
  advertiserLabel: null,
  body: null,
  buttonBackgroundColor: null,
  buttonTextColor: null,
  eligible: true,
  featuredCreator: null,
  fontFamily: null,
  id: `50000000-0000-4000-8000-00000000000${index}`,
  imageAlt: null,
  linkLabel: null,
  linkOnCreative: false,
  linkUrl: null,
  media: {
    alt: `Banner patrocinado ${index}`,
    url: `https://storage.example.test/banner-${index}`,
  },
  showAdvertiserLabel: false,
  showSponsoredBadge: false,
  sortOrder: index,
  textColor: null,
  title: `Campanha ${index}`,
  type: "TOP_BANNER",
});

function mockLandingPromotion(payload: unknown) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    if (String(input).includes("/api/public/sponsorships/landing")) {
      return Response.json(payload);
    }

    throw new Error("Backend unavailable");
  });
}

describe("Home", () => {
  it("keeps the static shell visible when every optional enhancement fails", async () => {
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Backend unavailable"));

    expect(dynamic).toBe("error");

    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Creators e marcas conectados no mesmo ritmo.",
      }),
    ).toBeInTheDocument();
    // Brand marquee, landing showcase and sponsorship promotion.
    await waitFor(() => expect(request).toHaveBeenCalledTimes(3));
    expect(
      screen.getAllByRole("link", { name: "Sou Influenciador" })[0],
    ).toHaveAttribute("href", "/sign-up?intent=influencer");
  });

  it("rotates the landing banners returned as a list", async () => {
    mockLandingPromotion([banner(1), banner(2), banner(3)]);

    render(<Home />);

    expect(
      await screen.findByRole("region", { name: "Banners patrocinados" }),
    ).toHaveAttribute("aria-roledescription", "carrossel");
    expect(screen.getByRole("button", { name: "Banner 3 de 3" })).toBeVisible();
  });

  it("still renders a single legacy cached banner object without rotation", async () => {
    mockLandingPromotion(banner(1));

    render(<Home />);

    expect(
      await screen.findByRole("region", { name: "Campanha 1" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Banners patrocinados" }),
    ).not.toBeInTheDocument();
  });

  it("renders no sponsorship section for an empty list", async () => {
    const request = mockLandingPromotion([]);

    const { container } = render(<Home />);

    await waitFor(() => expect(request).toHaveBeenCalledTimes(3));
    expect(
      container.querySelector('[data-slot="public-sponsorship-promotion"]'),
    ).toBeNull();
  });
});

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { RendererPlacementDto } from "@/features/sponsorships";
import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import {
  buildCatalogSponsoredCards,
  type CatalogSponsorshipSlotDto,
  CatalogSponsorshipSlots,
} from "./catalog-sponsorship-slots";

function placement(
  type: RendererPlacementDto["type"],
  overrides: Partial<RendererPlacementDto> = {},
): RendererPlacementDto {
  return {
    body: "Conteúdo preparado para a comunidade.",
    eligible: true,
    featuredCreator:
      type === "FEATURED_CREATOR"
        ? {
            avatar: {
              alt: "Foto de Creator em Destaque",
              url: "https://storage.example.test/signed-avatar",
            },
            creatorId: "10000000-0000-4000-8000-000000000010",
            displayName: "Creator em Destaque",
          }
        : null,
    id: `10000000-0000-4000-8000-00000000000${type.length % 10}`,
    linkOnCreative: false,
    showSponsoredBadge: true,
    showAdvertiserLabel: true,
    textColor: null,
    buttonBackgroundColor: null,
    buttonTextColor: null,
    fontFamily: null,
    imageAlt: null,
    linkLabel: "Conhecer oportunidade",
    linkUrl: "https://example.test/oportunidade",
    media:
      type === "FEATURED_CREATOR"
        ? null
        : {
            alt: `Criativo ${type}`,
            url: `https://storage.example.test/signed-${type.toLowerCase()}`,
          },
    sortOrder: 10,
    title: `Patrocínio ${type}`,
    type,
    ...overrides,
  };
}

function slot(
  type: RendererPlacementDto["type"],
  overrides: Partial<CatalogSponsorshipSlotDto> = {},
): CatalogSponsorshipSlotDto {
  return {
    audienceMatches: true,
    placement: placement(type),
    routeMatches: true,
    ...overrides,
  };
}

function featuredSlot(
  index: number,
  overrides: Partial<CatalogSponsorshipSlotDto> = {},
): CatalogSponsorshipSlotDto {
  return slot("FEATURED_CREATOR", {
    placement: placement("FEATURED_CREATOR", {
      featuredCreator: {
        avatar: null,
        creatorId: `10000000-0000-4000-8000-0000000001${String(index).padStart(2, "0")}`,
        displayName: `Creator ${index}`,
      },
      id: `10000000-0000-4000-8000-0000000002${String(index).padStart(2, "0")}`,
      title: `Destaque ${index}`,
    }),
    ...overrides,
  });
}

describe("CatalogSponsorshipSlots", () => {
  it("returns catalog content without an empty promotional layout when every slot is absent", () => {
    const { container } = render(
      <CatalogSponsorshipSlots>
        <div data-testid="catalog-content">Catálogo privado</div>
      </CatalogSponsorshipSlots>,
    );

    expect(screen.getByTestId("catalog-content")).toBeVisible();
    expect(
      container.querySelector('[data-slot="catalog-sponsorship-layout"]'),
    ).toBeNull();
  });

  it("composes every safe slot around the catalog without becoming its data owner", async () => {
    // jsdom has no layout: report the card row as overflowing so the
    // carousel shows its controls, as it does in a real narrow viewport.
    Object.defineProperties(HTMLElement.prototype, {
      clientWidth: { configurable: true, get: () => 448 },
      scrollWidth: { configurable: true, get: () => 900 },
    });
    const user = userEvent.setup();
    const { container } = render(
      <CatalogSponsorshipSlots
        slots={{
          carousel: [
            slot("CAROUSEL"),
            slot("CAROUSEL", {
              placement: placement("CAROUSEL", {
                id: "10000000-0000-4000-8000-000000000020",
                title: "Segundo patrocínio",
              }),
            }),
          ],
          featured: [slot("FEATURED_CREATOR")],
          side: slot("INLINE_BANNER"),
          top: slot("TOP_BANNER"),
        }}
      >
        <div data-testid="catalog-content">Catálogo privado</div>
      </CatalogSponsorshipSlots>,
    );

    expect(
      screen.getByRole("region", {
        name: "Patrocínio TOP_BANNER",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("region", {
        name: "Patrocínios no catálogo",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("article", {
        name: "Creator em destaque: Creator em Destaque",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("complementary", {
        name: "Patrocínio lateral: Patrocínio INLINE_BANNER",
      }),
    ).toHaveAttribute("data-mobile-presentation", "inline");
    expect(screen.getByTestId("catalog-content")).toBeVisible();

    const grid = container.querySelector(
      '[data-slot="catalog-with-side-placement"]',
    );
    expect(grid).toHaveClass("grid", "lg:grid-cols-[minmax(0,1fr)_18rem]");
    expect(
      container.querySelector('[data-slot="catalog-main-content"]'),
    ).toHaveClass("order-2", "lg:order-1");
    expect(
      container.querySelector('[data-slot="catalog-side-placement"]'),
    ).toHaveClass("order-1", "lg:order-2");

    const carousel = screen.getByRole("region", {
      name: "Patrocínios no catálogo",
    });
    await user.click(
      within(carousel).getByRole("button", {
        name: /posição 2 de 2 dos patrocínios/u,
      }),
    );
    expect(
      within(carousel).getByRole("button", {
        name: /posição 2 de 2 dos patrocínios/u,
      }),
    ).toHaveAttribute("aria-current", "true");
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
    Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
    Reflect.deleteProperty(HTMLElement.prototype, "scrollWidth");
  });

  it("renders a single featured creator with the existing full-width layout", () => {
    const { container } = render(
      <CatalogSponsorshipSlots slots={{ featured: [featuredSlot(1)] }}>
        <div data-testid="catalog-content">Catálogo privado</div>
      </CatalogSponsorshipSlots>,
    );

    expect(
      screen.getByRole("article", { name: "Creator em destaque: Creator 1" }),
    ).toBeVisible();
    expect(
      container.querySelector(
        '[data-slot="sponsorship-featured-creators-row"]',
      ),
    ).toBeNull();
  });

  it("lays several featured creators side by side in a row, in delivery order", () => {
    const { container } = render(
      <CatalogSponsorshipSlots
        slots={{
          featured: [featuredSlot(1), featuredSlot(2), featuredSlot(3)],
        }}
      >
        <div data-testid="catalog-content">Catálogo privado</div>
      </CatalogSponsorshipSlots>,
    );

    const row = container.querySelector(
      '[data-slot="sponsorship-featured-creators-row"]',
    );

    expect(row).not.toBeNull();
    expect(
      within(row as HTMLElement)
        .getAllByRole("article")
        .map((card) => card.getAttribute("aria-label")),
    ).toEqual([
      "Creator em destaque: Creator 1",
      "Creator em destaque: Creator 2",
      "Creator em destaque: Creator 3",
    ]);
    expect(
      within(row as HTMLElement).getAllByRole("link", {
        name: /Ver perfil de/,
      })[1],
    ).toHaveAttribute(
      "href",
      "/app/creators/10000000-0000-4000-8000-000000000102",
    );
    expect(screen.getByTestId("catalog-content")).toBeVisible();
  });

  it("only counts eligible featured creators when deciding whether to render the layout", () => {
    const { container } = render(
      <CatalogSponsorshipSlots
        slots={{
          featured: [
            featuredSlot(1, { audienceMatches: false }),
            featuredSlot(2, { routeMatches: false }),
          ],
        }}
      >
        <div data-testid="catalog-content">Catálogo privado</div>
      </CatalogSponsorshipSlots>,
    );

    expect(
      container.querySelector('[data-slot="catalog-sponsorship-layout"]'),
    ).toBeNull();
    expect(screen.getByTestId("catalog-content")).toBeVisible();
  });

  it("falls back to the single layout when only one featured creator remains eligible", () => {
    render(
      <CatalogSponsorshipSlots
        slots={{
          featured: [
            featuredSlot(1),
            featuredSlot(2, { audienceMatches: false }),
          ],
        }}
      >
        <div data-testid="catalog-content">Catálogo privado</div>
      </CatalogSponsorshipSlots>,
    );

    expect(
      screen.getByRole("article", { name: "Creator em destaque: Creator 1" }),
    ).toBeVisible();
    expect(screen.queryByText("Creator 2")).not.toBeInTheDocument();
  });

  it.each([320, 390, 768, 1_440])(
    "keeps the catalog and inline placement responsive at %d px",
    async (width) => {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: width,
      });
      const { container } = render(
        <CatalogSponsorshipSlots
          slots={{
            side: slot("INLINE_BANNER"),
            top: slot("TOP_BANNER"),
          }}
        >
          <div className="min-w-0" data-testid="catalog-content">
            Catálogo privado
          </div>
        </CatalogSponsorshipSlots>,
      );

      expect(
        container.querySelector('[data-slot="catalog-sponsorship-layout"]'),
      ).toHaveClass("w-full", "min-w-0");
      expect(
        screen.getByRole("complementary", {
          name: "Patrocínio lateral: Patrocínio INLINE_BANNER",
        }),
      ).toHaveClass("w-full", "min-w-0", "lg:w-72");
      expect(container.innerHTML).not.toContain("overflow-x-hidden");
      expect(
        await getBlockingComponentAccessibilityViolations(container),
      ).toEqual([]);
    },
  );

  it("drops audience, route and type mismatches before rendering a catalog slot", () => {
    const { container } = render(
      <CatalogSponsorshipSlots
        slots={{
          carousel: [
            slot("CAROUSEL", { audienceMatches: false }),
            slot("CAROUSEL", { routeMatches: false }),
          ],
          featured: [slot("TOP_BANNER")],
          side: slot("INLINE_BANNER", { routeMatches: false }),
          top: slot("TOP_BANNER", { audienceMatches: false }),
        }}
      >
        <div data-testid="catalog-content">Catálogo privado</div>
      </CatalogSponsorshipSlots>,
    );

    expect(screen.getByTestId("catalog-content")).toBeVisible();
    expect(
      container.querySelector('[data-slot="catalog-sponsorship-layout"]'),
    ).toBeNull();
    expect(screen.queryByText("Conteúdo patrocinado")).not.toBeInTheDocument();
  });
});

describe("buildCatalogSponsoredCards", () => {
  function midlistSlot(
    index: number,
    overrides: Partial<CatalogSponsorshipSlotDto> = {},
  ): CatalogSponsorshipSlotDto {
    return slot("CAROUSEL", {
      placement: placement("CAROUSEL", {
        id: `20000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
        title: `Midlist ${index}`,
      }),
      ...overrides,
    });
  }

  it("keeps every eligible card when there are fewer than the slot limit", () => {
    const cards = buildCatalogSponsoredCards({
      midlist: [midlistSlot(1), midlistSlot(2), midlistSlot(3)],
    });

    expect(cards).toHaveLength(3);
  });

  it("caps the listing at the catalog-midlist limit of 8 cards", () => {
    const midlist = Array.from({ length: 10 }, (_, index) =>
      midlistSlot(index + 1),
    );

    const cards = buildCatalogSponsoredCards({ midlist });
    const keys = cards.map((card) => card.key);
    const eligibleIds = midlist.map((item) => item.placement.id);

    expect(cards).toHaveLength(8);
    expect(new Set(keys).size).toBe(8);
    keys.forEach((key) => {
      expect(eligibleIds).toContain(key);
    });
  });

  it("drops audience, route and type mismatches before applying the limit", () => {
    const midlist = [
      midlistSlot(1, { audienceMatches: false }),
      midlistSlot(2, { routeMatches: false }),
      midlistSlot(4, {
        placement: placement("INLINE_BANNER", {
          id: "20000000-0000-4000-8000-000000000004",
        }),
      }),
      midlistSlot(5),
    ];

    const cards = buildCatalogSponsoredCards({ midlist });

    expect(cards.map((card) => card.key)).toEqual([
      "20000000-0000-4000-8000-000000000005",
    ]);
  });

  it("uses the injected RNG for the shuffle and keeps the first eight of that order", () => {
    const midlist = Array.from({ length: 10 }, (_, index) =>
      midlistSlot(index + 1),
    );
    // Picking the last index each time leaves the input order untouched.
    const keepOrderRng = (max: number) => max - 1;

    const cards = buildCatalogSponsoredCards({ midlist }, keepOrderRng);

    expect(cards.map((card) => card.key)).toEqual(
      midlist.slice(0, 8).map((item) => item.placement.id),
    );
  });
});

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { RendererPlacementDto } from "@/features/sponsorships";
import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import {
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
          featured: slot("FEATURED_CREATOR"),
          side: slot("INLINE_BANNER"),
          top: slot("TOP_BANNER"),
        }}
      >
        <div data-testid="catalog-content">Catálogo privado</div>
      </CatalogSponsorshipSlots>,
    );

    expect(
      screen.getByRole("region", {
        name: "Patrocínio: Patrocínio TOP_BANNER",
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
      within(carousel).getByRole("button", { name: "Próximo patrocínio" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Patrocínio 2 de 2: Segundo patrocínio",
    );
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
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
          featured: slot("TOP_BANNER"),
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

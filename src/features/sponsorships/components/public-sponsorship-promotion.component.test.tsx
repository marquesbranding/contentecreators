import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import type { RendererPlacementDto } from "../types/sponsorship-placement.types";
import { PublicSponsorshipPromotion } from "./public-sponsorship-promotion";

const promotion: RendererPlacementDto = {
  body: "Descubra uma oportunidade selecionada para a comunidade.",
  eligible: true,
  featuredCreator: null,
  id: "50000000-0000-4000-8000-000000000001",
  linkOnCreative: false,
  showSponsoredBadge: true,
  showAdvertiserLabel: true,
  textColor: null,
  buttonBackgroundColor: null,
  buttonTextColor: null,
  fontFamily: null,
  imageAlt: null,
  linkLabel: "Conhecer promoção",
  linkUrl: "https://example.test/promocao",
  media: {
    alt: "Campanha promocional genérica",
    url: "https://storage.example.test/signed-promotion",
  },
  sortOrder: 10,
  title: "Conteúdo patrocinado em destaque",
  type: "TOP_BANNER",
};

describe("PublicSponsorshipPromotion", () => {
  it("renders a safe, keyboard-accessible and screen-reader-labelled promotion", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <PublicSponsorshipPromotion promotions={[promotion]} />,
    );

    expect(
      screen.getByRole("region", {
        name: "Conteúdo patrocinado em destaque",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("img", {
        name: "Campanha promocional genérica",
      }),
    ).toHaveAttribute("src", "https://storage.example.test/signed-promotion");

    const link = screen.getByRole("link", {
      name: "Conhecer promoção",
    });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "sponsored noopener noreferrer");
    await user.tab();
    expect(link).toHaveFocus();
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });

  it.each([320, 390, 768, 1_440])(
    "keeps a mobile-first overflow-safe composition at %d px",
    async (width) => {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: width,
      });
      const { container } = render(
        <PublicSponsorshipPromotion promotions={[promotion]} />,
      );
      const slot = container.querySelector(
        '[data-slot="public-sponsorship-promotion"]',
      );

      expect(slot).toHaveClass("w-full", "min-w-0");
      expect(container.innerHTML).not.toContain("overflow-x");
      expect(
        await getBlockingComponentAccessibilityViolations(container),
      ).toEqual([]);
    },
  );

  it("omits unsafe links without hiding an otherwise valid promotion", () => {
    render(
      <PublicSponsorshipPromotion
        promotions={[
          {
            ...promotion,
            linkUrl: "https://usuario:segredo@example.test/credenciais",
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("region", {
        name: "Conteúdo patrocinado em destaque",
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Conhecer promoção" }),
    ).not.toBeInTheDocument();
  });

  it.each<[string, readonly RendererPlacementDto[] | null]>([
    ["absent", null],
    ["empty list", []],
    ["without media", [{ ...promotion, media: null }]],
    [
      "featured participant",
      [
        {
          ...promotion,
          featuredCreator: {
            avatar: null,
            creatorId: "70000000-0000-4000-8000-000000000001",
            displayName: "Participante protegida",
          },
        },
      ],
    ],
    [
      "wrong placement type",
      [{ ...promotion, type: "FEATURED_CREATOR" as const }],
    ],
    [
      "unsafe media URL",
      [
        {
          ...promotion,
          media: {
            ...promotion.media!,
            url: "data:image/svg+xml,private-profile",
          },
        },
      ],
    ],
  ])("renders nothing for an %s state", (_name, value) => {
    const { container } = render(
      <PublicSponsorshipPromotion promotions={value} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders a single banner exactly like the static hero, without rotation controls", () => {
    render(<PublicSponsorshipPromotion promotions={[promotion]} />);

    expect(
      screen.queryByRole("region", { name: "Banners patrocinados" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Ir para o banner \d de \d/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /rotação/ }),
    ).not.toBeInTheDocument();
  });

  it("rotates two or more banners and skips unrenderable ones", () => {
    render(
      <PublicSponsorshipPromotion
        promotions={[
          promotion,
          { ...promotion, id: "50000000-0000-4000-8000-000000000002" },
          {
            ...promotion,
            id: "50000000-0000-4000-8000-000000000003",
            media: null,
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("region", { name: "Banners patrocinados" }),
    ).toHaveAttribute("aria-roledescription", "carrossel");
    expect(
      screen.getAllByRole("button", { name: /Ir para o banner \d de 2/ }),
    ).toHaveLength(2);
  });
});

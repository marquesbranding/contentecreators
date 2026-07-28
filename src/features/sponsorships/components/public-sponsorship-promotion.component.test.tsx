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
      <PublicSponsorshipPromotion promotion={promotion} />,
    );

    expect(
      screen.getByRole("region", {
        name: "Patrocínio: Conteúdo patrocinado em destaque",
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
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
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
        <PublicSponsorshipPromotion promotion={promotion} />,
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
        promotion={{
          ...promotion,
          linkUrl: "https://usuario:segredo@example.test/credenciais",
        }}
      />,
    );

    expect(
      screen.getByRole("region", {
        name: "Patrocínio: Conteúdo patrocinado em destaque",
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Conhecer promoção" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["absent", null],
    ["without media", { ...promotion, media: null }],
    [
      "featured participant",
      {
        ...promotion,
        featuredCreator: {
          avatar: null,
          creatorId: "70000000-0000-4000-8000-000000000001",
          displayName: "Participante protegida",
        },
      },
    ],
    [
      "wrong placement type",
      { ...promotion, type: "FEATURED_CREATOR" as const },
    ],
    [
      "unsafe media URL",
      {
        ...promotion,
        media: {
          ...promotion.media!,
          url: "data:image/svg+xml,private-profile",
        },
      },
    ],
  ] as const)("renders nothing for an %s state", (_name, value) => {
    const { container } = render(
      <PublicSponsorshipPromotion promotion={value} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, expectTypeOf, it } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import { SponsorshipCarousel } from "./sponsorship-carousel.client";
import { SponsorshipFeaturedCreator } from "./sponsorship-featured-creator";
import {
  type SponsorshipCreativeViewModel,
  SponsorshipTopBanner,
} from "./sponsorship-presentation";
import { SponsorshipSidePlacement } from "./sponsorship-side-placement";

const baseCreative: SponsorshipCreativeViewModel = {
  advertiserLabel: "Marca Parceira",
  audienceMatches: true,
  body: "Uma oportunidade preparada para a comunidade.",
  eligible: true,
  id: "10000000-0000-4000-8000-000000000001",
  link: {
    href: "https://example.test/oportunidade",
    label: "Conhecer oportunidade",
  },
  media: {
    alt: "Campanha da Marca Parceira",
    height: 900,
    url: "https://storage.example.test/signed-creative",
    width: 1_600,
  },
  routeMatches: true,
  title: "Conteúdo que combina com você",
};

describe("sponsorship placement presentation", () => {
  it("renders a labelled top banner with authorized media and a safe external link", async () => {
    const { container, rerender } = render(
      <SponsorshipTopBanner
        creative={{ ...baseCreative, previewMode: true }}
      />,
    );

    expect(
      screen.getByRole("region", {
        name: "Patrocínio: Conteúdo que combina com você",
      }),
    ).toBeVisible();
    expect(screen.getByText("Conteúdo patrocinado")).toBeVisible();
    expect(
      screen.getByRole("status", { name: "Pré-visualização não publicada" }),
    ).toHaveTextContent("Pré-visualização");
    expect(
      screen.getByRole("img", { name: "Campanha da Marca Parceira" }),
    ).toHaveAttribute("src", baseCreative.media?.url);

    const link = screen.getByRole("link", {
      name: "Conhecer oportunidade",
    });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);

    rerender(
      <SponsorshipTopBanner
        creative={{
          ...baseCreative,
          link: {
            href: "javascript:alert('unsafe')",
            label: "Link inseguro",
          },
        }}
      />,
    );
    expect(
      screen.queryByRole("link", { name: "Link inseguro" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["ineligible", { eligible: false }],
    ["audience mismatch", { audienceMatches: false }],
    ["route mismatch", { routeMatches: false }],
  ])("suppresses a placement after %s", (_scenario, override) => {
    const { container } = render(
      <SponsorshipTopBanner creative={{ ...baseCreative, ...override }} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("suppresses participant-derived public creative while social proof is disabled", () => {
    const { container, rerender } = render(
      <SponsorshipTopBanner
        creative={{
          ...baseCreative,
          participantDerived: true,
          publicSocialProofEnabled: false,
          viewerIsPublic: true,
        }}
      />,
    );

    expect(container).toBeEmptyDOMElement();

    rerender(
      <SponsorshipTopBanner
        creative={{
          ...baseCreative,
          participantDerived: false,
          viewerIsPublic: true,
        }}
      />,
    );
    expect(
      screen.getByRole("region", {
        name: "Patrocínio: Conteúdo que combina com você",
      }),
    ).toBeVisible();
  });

  it.each([320, 390, 768, 1_440])(
    "keeps a side placement inline-safe at %d px",
    async (width) => {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: width,
      });
      const { container } = render(
        <SponsorshipSidePlacement creative={baseCreative} />,
      );

      const placement = screen.getByRole("complementary", {
        name: "Patrocínio lateral: Conteúdo que combina com você",
      });
      expect(placement).toHaveAttribute("data-mobile-presentation", "inline");
      expect(placement).toHaveClass("w-full", "min-w-0", "lg:w-72");
      expect(container.innerHTML).not.toContain("overflow-x");
      expect(
        await getBlockingComponentAccessibilityViolations(container),
      ).toEqual([]);
    },
  );

  it("supports keyboard and screen-reader navigation in the carousel", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SponsorshipCarousel
        creatives={[
          baseCreative,
          {
            ...baseCreative,
            id: "10000000-0000-4000-8000-000000000002",
            link: {
              href: "https://example.test/segunda",
              label: "Conhecer segunda oportunidade",
            },
            title: "Segunda oportunidade",
          },
          {
            ...baseCreative,
            eligible: false,
            id: "10000000-0000-4000-8000-000000000003",
            title: "Não deve aparecer",
          },
        ]}
        label="Oportunidades em destaque"
      />,
    );

    const carousel = screen.getByRole("region", {
      name: "Oportunidades em destaque",
    });
    expect(carousel).toHaveAttribute("aria-roledescription", "carrossel");
    expect(screen.queryByText("Não deve aparecer")).not.toBeInTheDocument();
    expect(screen.getByRole("list")).toHaveClass("overflow-x-auto");

    await user.click(
      within(carousel).getByRole("button", { name: "Próximo patrocínio" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Patrocínio 2 de 2: Segunda oportunidade",
    );
    expect(
      screen.getByRole("link", {
        name: "Conhecer segunda oportunidade",
      }),
    ).toHaveFocus();

    carousel.focus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Patrocínio 1 de 2: Conteúdo que combina com você",
    );
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });

  it("renders an eligible featured creator and suppresses an ineligible reference", async () => {
    const { container, rerender } = render(
      <SponsorshipFeaturedCreator
        creative={{ ...baseCreative, participantDerived: true }}
        creator={{
          bioExcerpt: "Conteúdo de tecnologia e cotidiano.",
          creatorTypeLabel: "Influenciador",
          detailHref: "/app/creators/creator-id",
          displayName: "Diego Aprova",
          eligible: true,
          location: "Rio de Janeiro, RJ",
          media: {
            alt: "Foto de Diego Aprova",
            url: "https://storage.example.test/signed-avatar",
          },
        }}
      />,
    );

    expect(
      screen.getByRole("article", {
        name: "Creator em destaque: Diego Aprova",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("img", { name: "Foto de Diego Aprova" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Ver perfil de Diego Aprova" }),
    ).toHaveAttribute("href", "/app/creators/creator-id");
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);

    rerender(
      <SponsorshipFeaturedCreator
        creative={{ ...baseCreative, participantDerived: true }}
        creator={{
          creatorTypeLabel: "Influenciador",
          detailHref: "/app/creators/creator-id",
          displayName: "Diego Aprova",
          eligible: false,
        }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("does not expose transactional or renewal props and renders no financial workflow", () => {
    type ForbiddenFinancialKey =
      | "checkout"
      | "commission"
      | "entitlement"
      | "escrow"
      | "invoice"
      | "payment"
      | "price"
      | "renewal"
      | "split";

    expectTypeOf<
      Extract<keyof SponsorshipCreativeViewModel, ForbiddenFinancialKey>
    >().toEqualTypeOf<never>();

    const { container } = render(
      <SponsorshipTopBanner creative={baseCreative} />,
    );
    expect(container.textContent).not.toMatch(
      /preço|pagamento|fatura|comissão|split|escrow|renovação|checkout/iu,
    );
    expect(
      screen.queryByRole("button", {
        name: /pagar|comprar|renovar|assinar/iu,
      }),
    ).not.toBeInTheDocument();
  });
});

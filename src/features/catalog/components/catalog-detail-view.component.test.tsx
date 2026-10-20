import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import type { CatalogCreatorDetailViewDto } from "../types/catalog-detail-view.types";
import { CatalogDetailView } from "./catalog-detail-view";

const detail: CatalogCreatorDetailViewDto = {
  bio: "Crio vídeos sobre beleza, rotina e consumo consciente.",
  contact: {
    email: { href: "mailto:creator@example.test" },
    social: [
      {
        href: "https://instagram.com/creator",
        platform: "INSTAGRAM",
      },
    ],
    status: "AVAILABLE",
  },
  creatorId: "10000000-0000-4000-8000-000000000001",
  creatorType: "INFLUENCER",
  displayName: "Creator Exemplo",
  isCdlMember: false,
  isInfluencerJourneyParticipant: false,
  location: { city: "São Paulo", state: "SP" },
  media: {
    avatar: {
      alt: "Foto de perfil de Creator Exemplo",
      expiresAt: "2026-07-28T18:00:00.000Z",
      height: 800,
      mimeType: "image/webp",
      url: "https://storage.example.test/signed-avatar",
      width: 800,
    },
    cover: null,
  },
  metrics: [
    {
      engagementRate: 3.5,
      followerCount: 12500,
      interactionCount: 640,
      isPrimary: true,
      newFollowerCount: 300,
      observedOn: "2026-07-20",
      platform: "INSTAGRAM",
      sharedContentCount: 22,
      sharedContentDescription: "Reels e stories de skincare.",
      source: "SELF_REPORTED",
      viewCount: 84000,
    },
    {
      engagementRate: null,
      followerCount: 8200,
      interactionCount: null,
      isPrimary: false,
      newFollowerCount: null,
      observedOn: "2026-07-18",
      platform: "TIKTOK",
      sharedContentCount: null,
      sharedContentDescription: null,
      source: "SELF_REPORTED",
      viewCount: null,
    },
  ],
  niches: [{ name: "Beleza", slug: "beleza" }],
  socialProfiles: [
    {
      handle: "@creator",
      href: "https://instagram.com/creator",
      platform: "INSTAGRAM",
    },
    {
      handle: "@creator_tiktok",
      href: "https://tiktok.com/@creator_tiktok",
      platform: "TIKTOK",
    },
  ],
  whatsapp: { href: "https://wa.me/5511999999999" },
  whatsappContactCount: 5,
};

describe("CatalogDetailView", () => {
  it("renders approved presentation data and company-only contact controls", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <CatalogDetailView detail={detail} status="success" />,
    );

    expect(
      screen.getByRole("heading", { name: "Creator Exemplo" }),
    ).toBeVisible();
    expect(screen.getAllByText("12.500 seguidores")).toHaveLength(1);
    expect(screen.queryByRole("link", { name: /e-mail/iu })).toBeNull();
    expect(
      screen.getByRole("link", {
        name: "Chamar Creator Exemplo no WhatsApp",
      }),
    ).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
    expect(
      screen.getByRole("link", { name: /^@creator(?!_)/u }),
    ).toHaveAttribute("href", "https://instagram.com/creator");
    expect(
      screen.getByRole("img", { name: /foto de perfil/iu }),
    ).toHaveAttribute("src", detail.media.avatar?.url);
    expect(screen.getByText(/5 empresas chamaram no whatsapp/iu)).toBeVisible();
    expect(JSON.stringify(container.innerHTML)).not.toMatch(
      /assetId|bucket|objectPath|cnpj|operationalEmail/iu,
    );

    expect(
      screen.getByRole("heading", { name: "Redes sociais" }),
    ).toBeVisible();
    expect(screen.getByText("@creator_tiktok")).toBeVisible();
    expect(screen.getByText("8.200 seguidores")).toBeVisible();

    expect(
      screen.getByRole("heading", { name: "Painel do Instagram" }),
    ).toBeVisible();
    expect(screen.getByText("Visualizações")).toBeVisible();
    expect(screen.getByText("84.000")).toBeVisible();
    expect(screen.getByText("300")).toBeVisible();
    expect(screen.getByText("Conteúdo compartilhado")).toBeVisible();
    expect(screen.getByText("22")).toBeVisible();
    expect(screen.queryByText(/Reels e stories de skincare\./iu)).toBeNull();

    await user.tab();
    expect(screen.getByRole("link", { name: /^voltar$/iu })).toHaveFocus();
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });

  it("keeps the legacy shared-content text only when there is no count", () => {
    const [instagram, ...others] = detail.metrics;

    render(
      <CatalogDetailView
        detail={{
          ...detail,
          metrics: [{ ...instagram!, sharedContentCount: null }, ...others],
        }}
        status="success"
      />,
    );

    expect(screen.getByText(/Reels e stories de skincare\./iu)).toBeVisible();
    expect(screen.queryByText("Conteúdo compartilhado")).toBeNull();
  });

  it("offers WhatsApp and clickable social links even without contact consent", () => {
    render(
      <CatalogDetailView
        detail={{
          ...detail,
          contact: {
            reason: "VIEWER_NOT_COMPANY",
            status: "UNAVAILABLE",
          },
        }}
        status="success"
      />,
    );

    expect(
      screen.getByRole("link", { name: "Chamar Creator Exemplo no WhatsApp" }),
    ).toHaveAttribute("href", "https://wa.me/5511999999999");
    const tiktok = screen.getByRole("link", { name: /@creator_tiktok/u });

    expect(tiktok).toHaveAttribute(
      "href",
      "https://tiktok.com/@creator_tiktok",
    );
    expect(tiktok).toHaveAttribute("target", "_blank");
  });

  it("does not invent private contacts for an influencer viewer", () => {
    render(
      <CatalogDetailView
        detail={{
          ...detail,
          contact: {
            reason: "VIEWER_NOT_COMPANY",
            status: "UNAVAILABLE",
          },
          whatsapp: null,
        }}
        status="success"
      />,
    );

    expect(
      screen.queryByRole("link", { name: /e-mail|whatsapp/iu }),
    ).toBeNull();
  });

  it("shows the CDL badge next to the name only when declared", () => {
    const { rerender } = render(
      <CatalogDetailView detail={detail} status="success" />,
    );

    expect(
      screen.queryByTitle("Associado da CDL (Câmara de Dirigentes Lojistas)"),
    ).not.toBeInTheDocument();

    rerender(
      <CatalogDetailView
        detail={{ ...detail, isCdlMember: true }}
        status="success"
      />,
    );

    expect(
      screen.getByTitle("Associado da CDL (Câmara de Dirigentes Lojistas)"),
    ).toBeVisible();
  });

  it("shows the Journey badge, never the explanatory note, only when declared", () => {
    const { rerender } = render(
      <CatalogDetailView detail={detail} status="success" />,
    );

    expect(
      screen.queryByRole("img", { name: "Jornada do Influenciador" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", {
        name: "www.jornadadoinfluenciador.com.br",
      }),
    ).not.toBeInTheDocument();

    rerender(
      <CatalogDetailView
        detail={{ ...detail, isInfluencerJourneyParticipant: true }}
        status="success"
      />,
    );

    expect(
      screen.getByRole("img", { name: "Jornada do Influenciador" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", {
        name: "www.jornadadoinfluenciador.com.br",
      }),
    ).not.toBeInTheDocument();
  });

  it("replaces stale details with a safe unavailable state", () => {
    render(<CatalogDetailView detail={null} status="success" />);

    expect(
      screen.getByRole("heading", { name: /perfil não disponível/iu }),
    ).toBeVisible();
    expect(screen.queryByText(detail.bio)).toBeNull();
    expect(screen.getByRole("link", { name: /^voltar$/iu })).toHaveAttribute(
      "href",
      "/app/catalog",
    );
  });

  it("supports recoverable loading and error states", async () => {
    const retry = vi.fn();
    const { rerender } = render(
      <CatalogDetailView detail={null} status="loading" />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Carregando perfil do creator",
    );

    rerender(
      <CatalogDetailView detail={null} onRetry={retry} status="error" />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /tentar novamente/iu }),
    );
    expect(retry).toHaveBeenCalledOnce();
  });

  it.each([320, 390, 768, 1440])(
    "keeps semantic detail regions accessible at %d px",
    async (width) => {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: width,
      });
      const { container } = render(
        <CatalogDetailView detail={detail} status="success" />,
      );

      expect(screen.getByRole("main")).toBeVisible();
      expect(
        screen.getByRole("group", { name: "Entre em contato" }),
      ).toBeVisible();
      expect(
        await getBlockingComponentAccessibilityViolations(container),
      ).toEqual([]);
    },
  );
});

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
    whatsapp: { href: "https://wa.me/5511999999999" },
  },
  creatorId: "10000000-0000-4000-8000-000000000001",
  creatorType: "INFLUENCER",
  displayName: "Creator Exemplo",
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
      observedOn: "2026-07-20",
      platform: "INSTAGRAM",
      source: "SELF_REPORTED",
      viewCount: 84000,
    },
  ],
  niches: [{ name: "Beleza", slug: "beleza" }],
  socialProfiles: [{ handle: "@creator", platform: "INSTAGRAM" }],
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
    expect(screen.getByText("12.500 seguidores")).toBeVisible();
    expect(screen.getByText("Métrica autodeclarada")).toBeVisible();
    expect(
      screen.getByRole("link", { name: /enviar e-mail/iu }),
    ).toHaveAttribute("href", "mailto:creator@example.test");
    expect(
      screen.getByRole("link", { name: /chamar no whatsapp/iu }),
    ).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
    expect(
      screen.getByRole("img", { name: /foto de perfil/iu }),
    ).toHaveAttribute("src", detail.media.avatar?.url);
    expect(screen.getByText(/5 empresas chamaram no whatsapp/iu)).toBeVisible();
    expect(JSON.stringify(container.innerHTML)).not.toMatch(
      /assetId|bucket|objectPath|cnpj|operationalEmail/iu,
    );
    await user.tab();
    expect(screen.getByRole("link", { name: /^voltar$/iu })).toHaveFocus();
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
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
        }}
        status="success"
      />,
    );

    expect(
      screen.getByText(/contatos ficam disponíveis somente para empresas/iu),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: /e-mail|whatsapp/iu }),
    ).toBeNull();
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
      expect(screen.getByRole("complementary")).toHaveAccessibleName(
        "Ações de contato",
      );
      expect(
        await getBlockingComponentAccessibilityViolations(container),
      ).toEqual([]);
    },
  );
});

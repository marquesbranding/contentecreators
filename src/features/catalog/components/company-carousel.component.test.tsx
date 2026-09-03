import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import type { CompanyCarouselViewResponseDto } from "../types/company-carousel-view.types";
import { CompanyCarouselView } from "./company-carousel";

const response: CompanyCarouselViewResponseDto = {
  items: [
    {
      city: "Joaçaba",
      companyId: "20000000-0000-4000-8000-000000000002",
      description: "Marca aberta a parcerias com creators locais.",
      displayName: "Marca Segura",
      email: "contato@marca.example",
      logo: {
        alt: "Logo da Marca Segura",
        expiresAt: "2026-07-28T18:00:00.000Z",
        height: 400,
        mimeType: "image/webp",
        url: "https://storage.example.test/signed-logo",
        width: 800,
      },
      segment: "Moda",
      state: "SC",
      websiteUrl: "https://marca.example/",
      whatsappE164: "+5549999999999",
    },
  ],
  limit: 12,
};

describe("CompanyCarouselView", () => {
  it("renders a keyboard-accessible company catalog linking to each profile", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <CompanyCarouselView response={response} status="success" />,
    );

    expect(
      screen.getByRole("region", { name: /marcas para conhecer/iu }),
    ).toBeVisible();
    expect(
      screen.getByRole("img", { name: "Logo da Marca Segura" }),
    ).toHaveAttribute("src", response.items[0]!.logo!.url);

    const profileLink = screen.getByRole("link", {
      name: /ver perfil de marca segura/iu,
    });

    expect(profileLink).toHaveAttribute(
      "href",
      "/app/companies/20000000-0000-4000-8000-000000000002",
    );
    // Contact channels (WhatsApp, e-mail, site) live on the profile page now,
    // not the catalog card — the card only links there.
    expect(container.innerHTML).not.toMatch(
      /cnpj|legalName|bucket|objectPath|assetId/iu,
    );
    await user.tab();
    expect(profileLink).toHaveFocus();
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });

  it("shows an empty-state message and a recoverable private error", async () => {
    const retry = vi.fn();
    const { rerender } = render(
      <CompanyCarouselView
        response={{ items: [], limit: 12 }}
        status="success"
      />,
    );

    expect(
      screen.getByText("Nenhuma empresa encontrada para esses filtros."),
    ).toBeVisible();

    rerender(
      <CompanyCarouselView onRetry={retry} response={null} status="error" />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /tentar novamente/iu }),
    );
    expect(retry).toHaveBeenCalledOnce();
  });

  it.each([320, 390, 768, 1440])(
    "preserves the private company list semantics at %d px",
    async (width) => {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: width,
      });
      const { container } = render(
        <CompanyCarouselView response={response} status="success" />,
      );

      expect(
        screen.getByRole("list", { name: "Marcas cadastradas" }),
      ).toHaveClass("grid");
      expect(
        await getBlockingComponentAccessibilityViolations(container),
      ).toEqual([]);
    },
  );
});

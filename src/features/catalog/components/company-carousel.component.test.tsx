import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import type { CompanyCarouselViewResponseDto } from "../types/company-carousel-view.types";
import { CompanyCarouselView } from "./company-carousel";

const response: CompanyCarouselViewResponseDto = {
  items: [
    {
      displayName: "Marca Segura",
      logo: {
        alt: "Logo da Marca Segura",
        expiresAt: "2026-07-28T18:00:00.000Z",
        height: 400,
        mimeType: "image/webp",
        url: "https://storage.example.test/signed-logo",
        width: 800,
      },
      websiteUrl: "https://marca.example/",
    },
  ],
  limit: 12,
};

describe("CompanyCarouselView", () => {
  it("renders a keyboard-accessible signed-logo carousel with safe links", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <CompanyCarouselView response={response} status="success" />,
    );

    expect(
      screen.getByRole("region", { name: /empresas na comunidade/iu }),
    ).toBeVisible();
    expect(
      screen.getByRole("img", { name: "Logo da Marca Segura" }),
    ).toHaveAttribute("src", response.items[0]?.logo.url);
    expect(
      screen.getByRole("link", { name: /visitar marca segura/iu }),
    ).toHaveAttribute("target", "_blank");
    expect(
      screen.getByRole("link", { name: /visitar marca segura/iu }),
    ).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
    expect(container.innerHTML).not.toMatch(
      /cnpj|legalName|email|whatsapp|bucket|objectPath|assetId/iu,
    );
    await user.tab();
    expect(
      screen.getByRole("link", { name: /visitar marca segura/iu }),
    ).toHaveFocus();
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });

  it("omits empty results and exposes a recoverable private error", async () => {
    const retry = vi.fn();
    const { rerender } = render(
      <CompanyCarouselView
        response={{ items: [], limit: 12 }}
        status="success"
      />,
    );

    expect(
      screen.queryByRole("region", { name: /empresas na comunidade/iu }),
    ).toBeNull();

    rerender(
      <CompanyCarouselView onRetry={retry} response={null} status="error" />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /tentar novamente/iu }),
    );
    expect(retry).toHaveBeenCalledOnce();
  });

  it.each([320, 390, 768, 1440])(
    "preserves the private horizontal list semantics at %d px",
    async (width) => {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: width,
      });
      const { container } = render(
        <CompanyCarouselView response={response} status="success" />,
      );

      expect(
        screen.getByRole("list", { name: "Empresas aprovadas" }),
      ).toHaveClass("overflow-x-auto");
      expect(
        await getBlockingComponentAccessibilityViolations(container),
      ).toEqual([]);
    },
  );
});

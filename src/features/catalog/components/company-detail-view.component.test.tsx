import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import type { CompanyDetailViewDto } from "../types/company-detail.types";
import { CompanyDetailView } from "./company-detail-view";

const detail: CompanyDetailViewDto = {
  companyId: "20000000-0000-4000-8000-000000000002",
  contact: {
    email: { href: "mailto:marca@example.test" },
    site: { href: "https://marca.example/" },
    whatsapp: { href: "https://wa.me/5549999999999" },
  },
  description: "Marca aberta a parcerias com creators locais.",
  displayName: "Marca Segura",
  location: { city: "Joaçaba", state: "SC" },
  media: {
    cover: null,
    logo: {
      alt: "Logo da Marca Segura",
      expiresAt: "2026-07-28T18:00:00.000Z",
      height: 400,
      mimeType: "image/webp",
      url: "https://storage.example.test/signed-logo",
      width: 800,
    },
  },
  segment: "Moda",
};

describe("CompanyDetailView", () => {
  it("renders company presentation and contact actions", async () => {
    const user = userEvent.setup();
    const { container } = render(<CompanyDetailView detail={detail} />);

    expect(screen.getByRole("heading", { name: "Marca Segura" })).toBeVisible();
    expect(screen.getByText("Joaçaba, SC")).toBeVisible();
    expect(
      screen.getByRole("link", { name: /chamar no whatsapp/iu }),
    ).toHaveAttribute("href", "https://wa.me/5549999999999");
    expect(
      screen.getByRole("link", { name: /enviar e-mail/iu }),
    ).toHaveAttribute("href", "mailto:marca@example.test");
    expect(screen.getByRole("link", { name: /abrir site/iu })).toHaveAttribute(
      "target",
      "_blank",
    );
    expect(
      screen.getByRole("img", { name: /logo da marca segura/iu }),
    ).toHaveAttribute("src", detail.media.logo?.url);
    expect(JSON.stringify(container.innerHTML)).not.toMatch(
      /cnpj|legalName|bucket|objectPath|assetId/iu,
    );
    await user.tab();
    expect(screen.getByRole("link", { name: /^voltar$/iu })).toHaveFocus();
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });

  it("shows a safe unavailable state", () => {
    render(<CompanyDetailView detail={null} />);

    expect(
      screen.getByRole("heading", { name: /marca não disponível/iu }),
    ).toBeVisible();
    expect(screen.queryByText(detail.description!)).toBeNull();
  });
});

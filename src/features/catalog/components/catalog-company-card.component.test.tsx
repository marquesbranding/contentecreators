import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import type { DirectoryCompanyBrowserEntryDto } from "../api/catalog-directory.contract";
import { CatalogCompanyCard } from "./catalog-company-card";

const company: DirectoryCompanyBrowserEntryDto = {
  city: "São Paulo",
  companyId: "20000000-0000-4000-8000-000000000001",
  cover: {
    height: 900,
    url: "https://media.example.test/signed/cover",
    width: 1600,
  },
  createdAt: "2026-08-01T12:00:00.000Z",
  description: "Marca de moda sustentável que conecta creators e lojas.",
  displayName: "Marca Exemplo",
  isCdlMember: false,
  isOwnProfile: false,
  kind: "COMPANY",
  logo: {
    height: 256,
    url: "https://media.example.test/signed/logo",
    width: 256,
  },
  segment: "Moda",
  state: "SP",
  websiteUrl: "https://marca.example/",
};

describe("CatalogCompanyCard", () => {
  it("presents the approved company fields, logo and cover", () => {
    const { container } = render(<CatalogCompanyCard company={company} />);

    expect(
      screen.getByRole("heading", { name: "Marca Exemplo", level: 3 }),
    ).toBeVisible();
    expect(screen.getByText("Empresa")).toBeVisible();
    expect(screen.getByText("São Paulo, SP")).toBeVisible();
    expect(screen.getByText("Moda")).toBeVisible();
    expect(screen.getByText(company.description ?? "")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Ver perfil de Marca Exemplo" }),
    ).toHaveAttribute("href", `/app/companies/${company.companyId}`);
    expect(
      screen.getByRole("img", { name: `Logo da ${company.displayName}` }),
    ).toHaveAttribute("src", company.logo?.url);
    expect(
      container.querySelector(`img[src="${company.cover?.url}"]`),
    ).not.toBeNull();
  });

  it("marks the viewer's own company and links straight to Meu perfil", () => {
    render(<CatalogCompanyCard company={{ ...company, isOwnProfile: true }} />);

    expect(screen.getByText("Você")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Ver meu perfil" }),
    ).toHaveAttribute("href", "/app/profile");
  });

  it("shows the CDL badge only when the company declared membership", () => {
    const { rerender } = render(<CatalogCompanyCard company={company} />);

    expect(
      screen.queryByTitle("Associado da CDL (Câmara de Dirigentes Lojistas)"),
    ).not.toBeInTheDocument();

    rerender(<CatalogCompanyCard company={{ ...company, isCdlMember: true }} />);

    expect(
      screen.getByTitle("Associado da CDL (Câmara de Dirigentes Lojistas)"),
    ).toBeVisible();
  });

  it("uses a safe fallback for a company without logo or cover", () => {
    const { container } = render(
      <CatalogCompanyCard
        company={{ ...company, cover: null, logo: null }}
      />,
    );

    expect(
      screen.getByLabelText(`${company.displayName} está sem logo`),
    ).toBeVisible();
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it("has no blocking accessibility violations", async () => {
    const { container } = render(<CatalogCompanyCard company={company} />);

    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });
});

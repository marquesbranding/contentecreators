import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CompanyProfileDto } from "../types/company-profile.types";
import { CompanyProfileEditForm } from "./company-profile-edit-form.client";

vi.mock("../hooks/use-cnpj-lookup", () => ({
  useCnpjLookup: () => ({
    data: { status: "unavailable" },
    lookupStatus: "unavailable",
    refetch: vi.fn(),
  }),
}));

const profile = {
  additionalLocations: [
    {
      city: "Curitiba",
      complement: "",
      label: "Filial Sul",
      neighborhood: "Centro",
      number: "120",
      postalCode: "80010000",
      state: "PR",
      street: "Rua das Flores",
    },
  ],
  city: "São Paulo",
  cnpj: "11222333000181",
  complement: "",
  coverAssetId: null,
  description:
    "Empresa de tecnologia que busca creators para campanhas institucionais.",
  employeeRange: "11_TO_50",
  legalName: "Empresa Exemplo Ltda.",
  logoAssetId: null,
  neighborhood: "Centro",
  number: "100",
  postalCode: "01001000",
  segment: "Tecnologia",
  socialPlatform: "LINKEDIN",
  socialUrl: "https://linkedin.com/company/empresa-exemplo",
  state: "SP",
  street: "Praça da Sé",
  tradeName: "Empresa Exemplo",
  version: 3,
  websiteUrl: "https://empresa.example/",
  whatsapp: "+5511999999999",
} satisfies CompanyProfileDto;

describe("CompanyProfileEditForm", () => {
  it("restores approved data and remains manually editable when BrasilAPI is offline", () => {
    render(
      <CompanyProfileEditForm
        action={vi.fn()}
        expectedVersion={profile.version}
        profile={profile}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Consulta automática indisponível",
    );
    expect(screen.getByLabelText("Razão social")).toHaveValue(
      "Empresa Exemplo Ltda.",
    );
    expect(screen.getByDisplayValue("Filial Sul")).toBeInTheDocument();
    expect(screen.queryByText("Termos e privacidade")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Salvar alterações" }),
    ).toBeEnabled();
  });

  it("uses a single-column base composition before responsive breakpoints", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 320,
    });
    const { container } = render(
      <CompanyProfileEditForm
        action={vi.fn()}
        expectedVersion={profile.version}
        profile={profile}
      />,
    );

    for (const grid of container.querySelectorAll(
      ".md\\:grid-cols-2, .sm\\:grid-cols-2",
    )) {
      expect(grid).not.toHaveClass("grid-cols-2");
    }
    expect(
      screen.getByRole("form", { name: "Editar perfil da empresa" }),
    ).toBeVisible();
  });
});

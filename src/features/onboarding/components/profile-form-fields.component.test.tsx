import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useCnpjLookupMock = vi.hoisted(() => vi.fn());

vi.mock("../hooks/use-cnpj-lookup", () => ({
  useCnpjLookup: useCnpjLookupMock,
}));

import { ProfileFormFields } from "./profile-form-fields.client";

describe("ProfileFormFields company CNPJ experience", () => {
  beforeEach(() => {
    useCnpjLookupMock.mockReturnValue({
      data: undefined,
      lookupStatus: "idle",
      refetch: vi.fn(),
    });
  });

  it("keeps every required company field editable when BrasilAPI is offline", async () => {
    const user = userEvent.setup();
    useCnpjLookupMock.mockReturnValue({
      data: { status: "unavailable" },
      lookupStatus: "unavailable",
      refetch: vi.fn(),
    });

    render(<ProfileFormFields role="COMPANY" />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Consulta automática indisponível",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Preenchimento manual disponível",
    );

    await user.type(
      screen.getByLabelText("Razão social"),
      "Empresa Manual Ltda.",
    );
    await user.type(screen.getByLabelText("Logradouro"), "Rua sem consulta");

    expect(screen.getByLabelText("Razão social")).toHaveValue(
      "Empresa Manual Ltda.",
    );
    expect(screen.getByLabelText("Logradouro")).toHaveValue("Rua sem consulta");
  });

  it("distinguishes required and optional fields in their labels", () => {
    const { container } = render(<ProfileFormFields role="COMPANY" />);

    expect(
      container.querySelector(
        'label[for="company-legal-name"] [data-slot="required-indicator"]',
      ),
    ).toBeInTheDocument();
    expect(
      container.querySelector(
        'label[for="company-website"] [data-slot="required-indicator"]',
      ),
    ).toBeNull();
    expect(screen.getByLabelText("Razão social")).toBeRequired();
    expect(screen.getByLabelText("Site (opcional)")).not.toBeRequired();
  });

  it("starts every applicable consent unchecked and keeps contact sharing optional", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ProfileFormFields role="INFLUENCER" />);
    const terms = screen.getByRole("checkbox", {
      name: /Li e aceito os Termos de Uso/iu,
    });
    const privacy = screen.getByRole("checkbox", {
      name: /Li e aceito a Política de Privacidade/iu,
    });
    const contact = screen.getByRole("checkbox", {
      name: /Autorizo que empresas aprovadas visualizem meus canais de contato/iu,
    });

    expect(terms).not.toBeChecked();
    expect(privacy).not.toBeChecked();
    expect(contact).not.toBeChecked();
    expect(contact).not.toHaveAttribute("aria-required", "true");

    await user.click(contact);
    expect(contact).toBeChecked();

    rerender(<ProfileFormFields role="COMPANY" />);
    expect(
      screen.queryByRole("checkbox", {
        name: /Autorizo que empresas aprovadas/iu,
      }),
    ).not.toBeInTheDocument();
  });

  it("restores an influencer draft while keeping every consent unchecked", () => {
    render(
      <ProfileFormFields
        initialValues={{
          bio: "Conteúdo restaurado sobre tecnologia e produtividade.",
          city: "Curitiba",
          creatorType: "UGC",
          displayName: "Creator Restaurada",
          engagementRate: 5.25,
          followers: 42000,
          legalName: "Joana Restaurada",
          nicheSlugs: ["tecnologia", "viagem"],
          socialPlatform: "YOUTUBE",
          socialUrl: "https://youtube.com/@creator-restaurada",
          state: "PR",
          whatsapp: "(41) 99999-9999",
        }}
        role="INFLUENCER"
      />,
    );

    expect(screen.getByLabelText("Nome completo")).toHaveValue(
      "Joana Restaurada",
    );
    expect(screen.getByLabelText("Nome de creator")).toHaveValue(
      "Creator Restaurada",
    );
    expect(screen.getByLabelText("Tipo de atuação")).toHaveTextContent(
      "Creator UGC",
    );
    expect(screen.getByLabelText("Canal principal")).toHaveTextContent(
      "YouTube",
    );
    expect(screen.getByRole("checkbox", { name: "Tecnologia" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Viagem" })).toBeChecked();
    expect(
      screen.getByRole("checkbox", {
        name: /Li e aceito os Termos de Uso/iu,
      }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", {
        name: /Li e aceito a Política de Privacidade/iu,
      }),
    ).not.toBeChecked();
  });

  it("shows a required custom niche field when the creator selects Outros", async () => {
    const user = userEvent.setup();
    render(<ProfileFormFields role="INFLUENCER" />);

    expect(
      screen.queryByLabelText("Qual é o outro nicho?"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Outros" }));

    const otherNiche = screen.getByLabelText("Qual é o outro nicho?");
    expect(otherNiche).toBeRequired();
    await user.type(otherNiche, "Artesanato sustentável");
    expect(otherNiche).toHaveValue("Artesanato sustentável");
  });

  it("offers predefined company segments and reveals a required text field for Outros", async () => {
    const user = userEvent.setup();
    render(<ProfileFormFields role="COMPANY" />);

    await user.click(screen.getByLabelText("Segmento"));
    await user.click(screen.getByRole("option", { name: "Outros" }));

    const otherSegment = screen.getByLabelText("Qual é o segmento?");
    expect(otherSegment).toBeRequired();
    await user.type(otherSegment, "Economia criativa");
    expect(otherSegment).toHaveValue("Economia criativa");
  });

  it("restores custom creator and company segments in the Outros fields", () => {
    const { unmount } = render(
      <ProfileFormFields
        initialValues={{
          nicheSlugs: ["outros"],
          otherNiche: "Cultura geek",
        }}
        role="INFLUENCER"
      />,
    );

    expect(screen.getByRole("checkbox", { name: "Outros" })).toBeChecked();
    expect(screen.getByLabelText("Qual é o outro nicho?")).toHaveValue(
      "Cultura geek",
    );

    unmount();
    render(
      <ProfileFormFields
        initialValues={{ segment: "Economia criativa" }}
        role="COMPANY"
      />,
    );

    expect(screen.getByLabelText("Segmento")).toHaveTextContent("Outros");
    expect(screen.getByLabelText("Qual é o segmento?")).toHaveValue(
      "Economia criativa",
    );
  });

  it("omits registration consents when an approved influencer edits the profile", () => {
    render(<ProfileFormFields role="INFLUENCER" showLegalConsents={false} />);

    expect(screen.queryByText("Termos e privacidade")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", {
        name: /Li e aceito os Termos de Uso/iu,
      }),
    ).not.toBeInTheDocument();
  });

  it("applies provider fields as an editable proposal", async () => {
    const user = userEvent.setup();
    useCnpjLookupMock.mockReturnValue({
      data: {
        data: {
          city: "São Paulo",
          complement: "8º andar",
          legalName: "Empresa Proposta Ltda.",
          neighborhood: "Centro",
          number: "100",
          postalCode: "01001000",
          segment: "Tecnologia",
          state: "SP",
          street: "Praça da Sé",
          tradeName: "Empresa Proposta",
        },
        status: "success",
      },
      lookupStatus: "success",
      refetch: vi.fn(),
    });

    render(<ProfileFormFields role="COMPANY" />);

    await user.click(
      screen.getByRole("button", { name: "Preencher dados encontrados" }),
    );

    expect(screen.getByLabelText("Razão social")).toHaveValue(
      "Empresa Proposta Ltda.",
    );
    expect(screen.getByLabelText("Nome fantasia")).toHaveValue(
      "Empresa Proposta",
    );
    expect(screen.getByLabelText("Logradouro")).toHaveValue("Praça da Sé");

    await user.clear(screen.getByLabelText("Nome fantasia"));
    await user.type(screen.getByLabelText("Nome fantasia"), "Nome revisado");
    expect(screen.getByLabelText("Nome fantasia")).toHaveValue("Nome revisado");
  });

  it("restores optional company social fields without marking them required", () => {
    render(
      <ProfileFormFields
        initialValues={{
          socialPlatform: "LINKEDIN",
          socialUrl: "https://linkedin.com/company/empresa-exemplo",
          websiteUrl: "https://empresa.example",
        }}
        role="COMPANY"
      />,
    );

    expect(screen.getByLabelText("Rede social (opcional)")).toHaveTextContent(
      "LinkedIn",
    );
    expect(screen.getByLabelText("Link da rede social (opcional)")).toHaveValue(
      "https://linkedin.com/company/empresa-exemplo",
    );
    expect(
      screen.getByLabelText("Link da rede social (opcional)"),
    ).not.toBeRequired();
  });

  it("adds and removes editable secondary locations while keeping the headquarters primary", async () => {
    const user = userEvent.setup();
    render(<ProfileFormFields role="COMPANY" />);

    expect(screen.getByText("Localização principal")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Adicionar localidade" }),
    );

    expect(screen.getByText("Localidade adicional 1")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Nome da localidade"), "Filial Sul");
    await user.type(
      screen.getByLabelText("Logradouro da localidade"),
      "Rua das Flores",
    );
    expect(screen.getByLabelText("Nome da localidade")).toHaveValue(
      "Filial Sul",
    );

    await user.click(
      screen.getByRole("button", { name: "Remover localidade 1" }),
    );
    expect(
      screen.queryByText("Localidade adicional 1"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Localização principal")).toBeInTheDocument();
  });
});

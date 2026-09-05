import { render, screen, waitFor } from "@testing-library/react";
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

    render(
      <ProfileFormFields
        initialValues={{
          cnpj: "11444777000161",
        }}
        role="COMPANY"
      />,
    );

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

  it("starts company data with the CNPJ lookup before the editable registry fields", () => {
    render(<ProfileFormFields role="COMPANY" />);

    const cnpj = screen.getByLabelText("CNPJ");
    const legalName = screen.getByLabelText("Razão social");

    expect(screen.getByText("Comece pelo CNPJ")).toBeInTheDocument();
    expect(
      cnpj.compareDocumentPosition(legalName) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("keeps the persisted company values when the saved CNPJ is reviewed", () => {
    useCnpjLookupMock.mockReturnValue({
      data: {
        data: {
          legalName: "Nome retornado pela API Ltda.",
          tradeName: "Nome da API",
        },
        status: "success",
      },
      lookupStatus: "success",
      refetch: vi.fn(),
    });

    render(
      <ProfileFormFields
        initialValues={{
          cnpj: "11444777000161",
          legalName: "Nome salvo no cadastro Ltda.",
          tradeName: "Nome salvo",
        }}
        role="COMPANY"
      />,
    );

    expect(screen.getByLabelText("Razão social")).toHaveValue(
      "Nome salvo no cadastro Ltda.",
    );
    expect(screen.getByLabelText("Nome fantasia")).toHaveValue("Nome salvo");
  });

  it("does not show stale automatic-fill feedback for an invalid current CNPJ", () => {
    useCnpjLookupMock.mockReturnValue({
      data: {
        data: {
          legalName: "Empresa retornada Ltda.",
        },
        status: "success",
      },
      lookupStatus: "success",
      refetch: vi.fn(),
    });

    render(
      <ProfileFormFields
        initialValues={{
          cnpj: "07526557000101",
        }}
        role="COMPANY"
      />,
    );

    expect(
      screen.queryByText("Dados preenchidos automaticamente"),
    ).not.toBeInTheDocument();
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
          legalName: "Joana Restaurada",
          nicheSlugs: ["tecnologia-games-e-inovacao", "viagens-e-turismo"],
          socialChannels: [
            {
              followerCount: 42000,
              isPrimary: true,
              platform: "YOUTUBE",
              url: "https://youtube.com/@creator-restaurada",
            },
          ],
          state: "PR",
          whatsapp: "(41) 99999-9999",
        }}
        role="INFLUENCER"
      />,
    );

    expect(screen.getByLabelText("Nome completo")).toHaveValue(
      "Joana Restaurada",
    );
    expect(screen.getByRole("radio", { name: /sou ugc/iu })).toBeChecked();
    expect(
      screen.getByRole("radio", { name: /sou influencer/iu }),
    ).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "YouTube" })).toBeChecked();
    expect(screen.getByLabelText("Link do perfil no YouTube")).toHaveValue(
      "https://youtube.com/@creator-restaurada",
    );
    expect(screen.getByText("Tecnologia, games e inovação")).toBeVisible();
    expect(screen.getByText("Viagens e turismo")).toBeVisible();
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

    const nichesCombobox = screen.getByRole("combobox", {
      name: "Principais nichos",
    });
    await user.click(nichesCombobox);
    await user.click(
      await screen.findByRole("option", { name: "Envie sua sugestão" }),
    );

    const otherNiche = screen.getByLabelText("Qual é o outro nicho?");
    expect(otherNiche).toBeRequired();
    await user.type(otherNiche, "Artesanato sustentável");
    expect(otherNiche).toHaveValue("Artesanato sustentável");
  });

  it("keeps the niche chips and the search input flowing in the same row", async () => {
    const user = userEvent.setup();
    const { container } = render(<ProfileFormFields role="INFLUENCER" />);

    const nichesCombobox = screen.getByRole("combobox", {
      name: "Principais nichos",
    });
    await user.click(nichesCombobox);
    await user.click(
      await screen.findByRole("option", {
        name: "Tecnologia, games e inovação",
      }),
    );

    const chipsContainer = container.querySelector(
      '[data-slot="combobox-chips"]',
    );
    const chip = chipsContainer?.querySelector('[data-slot="combobox-chip"]');
    expect(chip).toHaveTextContent("Tecnologia, games e inovação");
    expect(chip?.querySelector("span")).toHaveAttribute(
      "title",
      "Tecnologia, games e inovação",
    );
    expect(chipsContainer).toContainElement(nichesCombobox);
  });

  it("offers predefined company segments and reveals a required text field for Outros", async () => {
    const user = userEvent.setup();
    render(<ProfileFormFields role="COMPANY" />);

    await user.click(screen.getByLabelText("Segmento"));
    await user.click(await screen.findByRole("option", { name: "Outros" }));

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

    expect(screen.getByText("Envie sua sugestão")).toBeVisible();
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

    expect(screen.getByLabelText("Segmento")).toHaveValue("Outros");
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
    await user.type(screen.getByLabelText("CNPJ"), "11444777000161");

    await waitFor(() => {
      expect(screen.getByLabelText("Razão social")).toHaveValue(
        "Empresa Proposta Ltda.",
      );
    });
    expect(screen.getByLabelText("Nome fantasia")).toHaveValue(
      "Empresa Proposta",
    );
    expect(screen.getByLabelText("Logradouro")).toHaveValue("Praça da Sé");

    await user.click(
      screen.getByRole("button", { name: "Preencher novamente" }),
    );

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

    expect(screen.getByLabelText("Rede social (opcional)")).toHaveValue(
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

  it("orders the social channel columns as rede social, seguidores, link e principal", () => {
    const { container } = render(<ProfileFormFields role="INFLUENCER" />);

    const header = container.querySelector(
      '[data-field-name="socialChannels"] .uppercase',
    );
    const headerText = header?.textContent ?? "";
    const order = [
      "Rede social",
      "Seguidores",
      "Link do perfil",
      "Principal",
    ].map((label) => headerText.indexOf(label));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);

    expect(
      screen.getByRole("button", { name: "O que é a rede principal" }),
    ).toBeInTheDocument();
  });

  it("shows the primary-network tooltip on hover and on keyboard focus", async () => {
    const user = userEvent.setup();
    render(<ProfileFormFields role="INFLUENCER" />);

    const trigger = screen.getByRole("button", {
      name: "O que é a rede principal",
    });

    await user.hover(trigger);
    expect(
      await screen.findByText(
        "Escolha sua principal rede social, essa informação ganhará destaque no seu perfil",
      ),
    ).toBeVisible();
    await user.unhover(trigger);

    trigger.focus();
    expect(
      await screen.findByText(
        "Escolha sua principal rede social, essa informação ganhará destaque no seu perfil",
      ),
    ).toBeVisible();
  });

  it("shows the Instagram autodeclared metrics panel with a tooltip on shared content", async () => {
    const user = userEvent.setup();
    render(<ProfileFormFields role="INFLUENCER" />);

    await user.click(screen.getByRole("checkbox", { name: "Instagram" }));

    expect(
      screen.getByText("Métricas do Instagram (autodeclaradas)"),
    ).toBeInTheDocument();

    const shareTooltipTrigger = screen.getByRole("button", {
      name: "Sobre Conteúdo que você compartilhou",
    });
    await user.hover(shareTooltipTrigger);

    expect(
      await screen.findByText(
        "Essa informação você encontra no Painel Profissional, no seu perfil de Instagram",
      ),
    ).toBeVisible();
  });
});

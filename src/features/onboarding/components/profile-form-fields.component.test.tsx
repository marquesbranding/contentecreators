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
});

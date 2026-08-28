import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import { CombinedRegistrationForm } from "./combined-registration-form.client";

vi.mock("../hooks/use-cnpj-lookup", () => ({
  useCnpjLookup: () => ({
    data: null,
    lookupStatus: "idle",
    refetch: vi.fn(),
  }),
}));

function renderRegistration(
  props: React.ComponentProps<typeof CombinedRegistrationForm>,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <CombinedRegistrationForm {...props} />
    </QueryClientProvider>,
  );
}

async function selectOption(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  option: string,
) {
  await user.click(screen.getByRole("combobox", { name: label }));
  await user.click(await screen.findByRole("option", { name: option }));
}

async function fillAccessFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("E-mail"), "teste@exemplo.com");
  await user.type(screen.getByLabelText("Senha"), "SenhaForte1");
  await user.type(screen.getByLabelText("Confirmar senha"), "SenhaForte1");
  await user.type(screen.getByLabelText("WhatsApp com DDD"), "11999999999");
}

async function acceptRequiredConsents(
  user: ReturnType<typeof userEvent.setup>,
) {
  void user;
  fireEvent.click(
    screen.getByRole("checkbox", { name: /Li e aceito os Termos de Uso/iu }),
  );
  fireEvent.click(
    screen.getByRole("checkbox", {
      name: /Li e aceito a Política de Privacidade/iu,
    }),
  );
}

async function fillCreatorFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Nome completo"), "Creator Exemplo");
  await user.type(
    screen.getByLabelText("Conte sobre seu conteúdo"),
    "Crio conteúdo sobre tecnologia, cultura e negócios locais.",
  );
  await user.click(screen.getByRole("checkbox", { name: "Instagram" }));
  await user.type(screen.getByLabelText("Seguidores no Instagram"), "15000");
  await user.type(
    screen.getByLabelText("Link do perfil no Instagram"),
    "https://instagram.com/creator_teste",
  );
  await user.click(
    screen.getByRole("combobox", { name: "Principais nichos" }),
  );
  await user.click(
    await screen.findByRole("option", { name: "Tecnologia, games e inovação" }),
  );
  await user.type(
    screen.getByLabelText("Cidade", { exact: true }),
    "São Paulo",
  );
  await selectOption(user, "UF", "SP");
  await acceptRequiredConsents(user);
}

async function fillCompanyFields(user: ReturnType<typeof userEvent.setup>) {
  fireEvent.input(screen.getByLabelText("Razão social"), {
    target: { value: "Empresa Exemplo Ltda." },
  });
  fireEvent.input(screen.getByLabelText("Nome fantasia"), {
    target: { value: "Empresa Exemplo" },
  });
  fireEvent.input(screen.getByLabelText("CNPJ"), {
    target: { value: "11444777000161" },
  });
  await selectOption(user, "Segmento", "Tecnologia");
  await selectOption(user, "Tamanho da empresa", "11 a 50 pessoas");
  await user.type(
    screen.getByLabelText("Apresente a empresa"),
    "Empresa preparada para validar o fluxo completo de cadastro.",
  );
  await user.type(screen.getByLabelText("CEP"), "01001000");
  await user.type(screen.getByLabelText("Logradouro"), "Praça da Sé");
  await user.type(screen.getByLabelText("Número"), "100");
  await user.type(screen.getByLabelText("Bairro"), "Sé");
  await user.type(
    screen.getByLabelText("Cidade", { exact: true }),
    "São Paulo",
  );
  await selectOption(user, "UF", "SP");
  await acceptRequiredConsents(user);
}

describe("combined registration form", () => {
  it("opens the influencer fields from a landing intent without a second role step", () => {
    renderRegistration({
      action: vi.fn(),
      googleAction: vi.fn(),
      initialRole: "INFLUENCER",
      resendAction: vi.fn(),
    });

    expect(
      screen.getByRole("radio", { name: /sou influencer/iu }),
    ).toBeChecked();
    expect(
      screen.getByLabelText("Seguidores no Instagram"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("CNPJ")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Criar conta e enviar perfil" }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        "Preencha corretamente todos os campos obrigatórios para liberar o envio.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("ADMIN")).not.toBeInTheDocument();
  });

  it("changes the role-specific fields in the same registration form", async () => {
    const user = userEvent.setup();

    renderRegistration({
      action: vi.fn(),
      googleAction: vi.fn(),
      initialRole: "INFLUENCER",
      resendAction: vi.fn(),
    });

    await user.click(screen.getByRole("radio", { name: /sou empresa/iu }));

    expect(screen.getByLabelText("CNPJ")).toBeInTheDocument();
    expect(screen.getByLabelText("Nome fantasia")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Seguidores no Instagram"),
    ).not.toBeInTheDocument();
  });

  it("keeps Base UI fields controlled when registration starts without an intent", async () => {
    const user = userEvent.setup();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warningSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      renderRegistration({
        action: vi.fn(),
        googleAction: vi.fn(),
        resendAction: vi.fn(),
      });

      await user.click(screen.getByRole("radio", { name: /sou empresa/iu }));

      expect(
        screen.getByRole("radio", { name: /sou empresa/iu }),
      ).toBeChecked();
      expect(screen.getByLabelText("CNPJ")).toBeInTheDocument();
      expect(
        [...errorSpy.mock.calls, ...warningSpy.mock.calls].some((call) =>
          call.some(
            (value) =>
              typeof value === "string" &&
              /uncontrolled|changing the default value state/iu.test(value),
          ),
        ),
      ).toBe(false);
    } finally {
      errorSpy.mockRestore();
      warningSpy.mockRestore();
    }
  });

  it("starts Google without carrying a preselected trusted role", () => {
    const { container } = renderRegistration({
      action: vi.fn(),
      googleAction: vi.fn(),
      initialRole: "COMPANY",
      resendAction: vi.fn(),
    });
    const googleForm = screen
      .getByRole("button", { name: "Continuar com o Google" })
      .closest("form");

    expect(googleForm).not.toBeNull();
    expect(googleForm?.querySelector('input[name="role"]')).toBeNull();
    expect(
      container.querySelector('form input[name="email"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("separator", { name: "Outras formas de acesso" }),
    ).toHaveTextContent("ou continue com");
    expect(
      screen
        .getByRole("button", { name: "Continuar com o Google" })
        .querySelector('[data-slot="google-auth-icon"]'),
    ).toBeInTheDocument();
  });

  it("uses touch-friendly visibility controls and validates matching passwords before submission", async () => {
    const user = userEvent.setup();
    const action = vi.fn();

    renderRegistration({
      action,
      googleAction: vi.fn(),
      initialRole: "INFLUENCER",
      resendAction: vi.fn(),
    });

    const password = screen.getByLabelText("Senha");
    const confirmation = screen.getByLabelText("Confirmar senha");
    const visibilityButtons = screen.getAllByRole("button", {
      name: "Mostrar senha",
    });

    expect(visibilityButtons).toHaveLength(2);
    expect(visibilityButtons[0]).toHaveClass("min-h-11", "min-w-11");

    await user.click(visibilityButtons[0]!);
    expect(password).toHaveAttribute("type", "text");

    await user.type(password, "SenhaForte1");
    await user.type(confirmation, "SenhaForte2");
    await user.click(screen.getByLabelText("E-mail"));

    expect(action).not.toHaveBeenCalled();
    expect(confirmation).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByText("As senhas precisam ser iguais."),
    ).toBeInTheDocument();

    await user.clear(confirmation);
    await user.type(confirmation, "SenhaForte1");

    expect(confirmation).toHaveAttribute("aria-invalid", "false");
  });

  it("keeps submission disabled until the required role and fields are valid", async () => {
    const action = vi.fn();

    renderRegistration({
      action,
      googleAction: vi.fn(),
      resendAction: vi.fn(),
    });

    const submit = screen.getByRole("button", {
      name: "Criar conta e enviar perfil",
    });
    expect(action).not.toHaveBeenCalled();
    expect(submit).toBeDisabled();
    expect(
      screen.getByRole("radiogroup", {
        name: /como você vai usar a plataforma/iu,
      }),
    ).toHaveAttribute("aria-required", "true");
  });

  it("shows minimum lengths and preserves creator values after a server error", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({
      fieldErrors: { socialUrl: ["Não foi possível validar este perfil."] },
      message: "Revise o endereço informado.",
      status: "error" as const,
    }));
    renderRegistration({
      action,
      googleAction: vi.fn(),
      initialRole: "INFLUENCER",
      resendAction: vi.fn(),
    });

    expect(screen.getByLabelText("Nome completo")).toHaveAttribute(
      "minlength",
      "3",
    );
    expect(screen.getByLabelText("Conte sobre seu conteúdo")).toHaveAttribute(
      "minlength",
      "30",
    );
    expect(screen.getByText(/Mínimo de 30 caracteres/iu)).toBeInTheDocument();

    await fillAccessFields(user);
    await fillCreatorFields(user);

    const submit = screen.getByRole("button", {
      name: "Criar conta e enviar perfil",
    });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar envio" }));

    expect(
      await screen.findByText("Revise o endereço informado."),
    ).toBeVisible();
    expect(action).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("E-mail")).toHaveValue("teste@exemplo.com");
    expect(screen.getByLabelText("Nome completo")).toHaveValue(
      "Creator Exemplo",
    );
    expect(screen.getByLabelText("Cidade", { exact: true })).toHaveValue(
      "São Paulo",
    );
    expect(screen.getByLabelText("Conte sobre seu conteúdo")).toHaveValue(
      "Crio conteúdo sobre tecnologia, cultura e negócios locais.",
    );
  });

  it("preserves company values after a server error", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({
      fieldErrors: { cnpj: ["Este CNPJ já está em análise."] },
      message: "Não foi possível concluir o cadastro.",
      status: "error" as const,
    }));
    renderRegistration({
      action,
      googleAction: vi.fn(),
      initialRole: "COMPANY",
      resendAction: vi.fn(),
    });

    await fillAccessFields(user);
    await fillCompanyFields(user);

    const submit = screen.getByRole("button", {
      name: "Criar conta e enviar perfil",
    });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar envio" }));

    expect(
      await screen.findByText("Não foi possível concluir o cadastro."),
    ).toBeVisible();
    expect(action).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("E-mail")).toHaveValue("teste@exemplo.com");
    expect(screen.getByLabelText("Razão social")).toHaveValue(
      "Empresa Exemplo Ltda.",
    );
    expect(screen.getByLabelText("Nome fantasia")).toHaveValue(
      "Empresa Exemplo",
    );
    expect(screen.getByLabelText("CNPJ")).toHaveValue("11444777000161");
    expect(screen.getByLabelText("Logradouro")).toHaveValue("Praça da Sé");
  });

  it("has no serious or critical automated accessibility violations", async () => {
    const { container } = renderRegistration({
      action: vi.fn(),
      googleAction: vi.fn(),
      initialRole: "INFLUENCER",
      resendAction: vi.fn(),
    });

    await expect(
      getBlockingComponentAccessibilityViolations(container),
    ).resolves.toEqual([]);
  });
});

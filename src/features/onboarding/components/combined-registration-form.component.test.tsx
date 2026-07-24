import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import { CombinedRegistrationForm } from "./combined-registration-form.client";

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

describe("combined registration form", () => {
  it("opens the influencer fields from a landing intent without a second role step", () => {
    renderRegistration({
      action: vi.fn(),
      googleAction: vi.fn(),
      initialRole: "INFLUENCER",
      resendAction: vi.fn(),
    });

    expect(screen.getByRole("radio", { name: /sou creator/iu })).toBeChecked();
    expect(screen.getByLabelText("Nome de creator")).toBeInTheDocument();
    expect(screen.queryByLabelText("CNPJ")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Criar conta e enviar perfil" }),
    ).toBeEnabled();
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
    expect(screen.queryByLabelText("Nome de creator")).not.toBeInTheDocument();
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
  });

  it("blocks an empty submission and identifies the required role", async () => {
    const user = userEvent.setup();
    const action = vi.fn();

    renderRegistration({
      action,
      googleAction: vi.fn(),
      resendAction: vi.fn(),
    });

    await user.click(
      screen.getByRole("button", { name: "Criar conta e enviar perfil" }),
    );

    expect(action).not.toHaveBeenCalled();
    expect(
      screen.getByRole("radiogroup", {
        name: /como você vai usar a plataforma/iu,
      }),
    ).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByText("Escolha como você vai usar a plataforma."),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /sou creator/iu })).toHaveFocus();
  });

  it("validates custom required profile fields in the selected flow", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    const { container } = renderRegistration({
      action,
      googleAction: vi.fn(),
      initialRole: "INFLUENCER",
      resendAction: vi.fn(),
    });

    await user.click(
      screen.getByRole("button", { name: "Criar conta e enviar perfil" }),
    );

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Tipo de atuação")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      container.querySelector('[data-field-name="nicheSlugs"]'),
    ).toHaveAttribute("data-invalid", "true");
    expect(
      container.querySelector('[data-field-name="termsAccepted"]'),
    ).toHaveAttribute("aria-invalid", "true");
    expect(screen.getAllByText("Selecione uma opção.").length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getByText("Escolha pelo menos um nicho."),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Você precisa aceitar para continuar."),
    ).toHaveLength(2);
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

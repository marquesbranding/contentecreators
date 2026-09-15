import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RegistrationEmailStep } from "./registration-email-step.client";
import { RegistrationVerifyStep } from "./registration-verify-step.client";
import { RegistrationAccountStep } from "./registration-account-step.client";

describe("registration journey steps", () => {
  it("collects only email and opens the existing-account dialog on blur", async () => {
    const user = userEvent.setup();
    render(
      <RegistrationEmailStep
        action={vi.fn()}
        checkAction={async (email) => ({
          status: "account_exists",
          email,
          providers: ["email"],
        })}
        googleAction={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText("Senha")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("E-mail"), "pessoa@example.com");
    await user.tab();
    expect(
      await screen.findByRole("dialog", { name: "Você já possui um cadastro" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Esqueci minha senha" }),
    ).toHaveAttribute("href", "/forgot-password");
  });
  it("masks verification context, requires six digits and starts resend cooldown", () => {
    render(
      <RegistrationVerifyStep
        action={vi.fn()}
        resendAction={vi.fn()}
        maskedEmail="p***@example.com"
      />,
    );
    expect(screen.getByText("p***@example.com")).toBeVisible();
    expect(screen.getByLabelText("Código de 6 dígitos")).toHaveAttribute(
      "autocomplete",
      "one-time-code",
    );
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Reenviar código em 60s" }),
    ).toBeDisabled();
  });
  it("keeps Google name editable, email locked and passwords absent", () => {
    render(
      <RegistrationAccountStep
        action={vi.fn()}
        email="pessoa@example.com"
        fullName="Pessoa Teste"
        requiresPassword={false}
      />,
    );
    expect(screen.getByLabelText("Nome completo")).toHaveValue("Pessoa Teste");
    expect(screen.getByLabelText("E-mail")).toBeDisabled();
    expect(screen.queryByLabelText("Senha")).not.toBeInTheDocument();
  });
});

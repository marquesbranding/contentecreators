import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import { LoginForm } from "./login-form.client";
import { ResetPasswordRecoveryGate } from "./reset-password-recovery-gate.client";
import { ResetPasswordForm } from "./reset-password-form.client";
import { SignUpForm } from "./sign-up-form.client";

const supabaseAuthMock = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(async (): Promise<{ error: Error | null }> => ({
    error: null,
  })),
  signOut: vi.fn(async (): Promise<{ error: Error | null }> => ({
    error: null,
  })),
  updateUser: vi.fn(async (): Promise<{ error: Error | null }> => ({
    error: null,
  })),
}));

vi.mock("next/image", () => ({
  default: ({
    alt = "",
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}));

vi.mock("@/shared/lib/supabase/browser-client", () => ({
  getBrowserSupabaseClient: vi.fn(() => ({
    auth: supabaseAuthMock,
  })),
}));

describe("identity auth forms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, "", "/");
  });

  it("offers only supported login methods and recovery navigation", () => {
    render(
      <LoginForm
        googleAction={vi.fn()}
        initialNextPath="/onboarding/role"
        signInAction={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("E-mail")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password");
    const googleButton = screen.getByRole("button", {
      name: "Continuar com o Google",
    });

    expect(googleButton).toBeInTheDocument();
    expect(
      screen.getByRole("separator", { name: "Outras formas de acesso" }),
    ).toHaveTextContent("ou continue com");
    expect(
      googleButton.querySelector('[data-slot="google-auth-icon"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Esqueci minha senha" }),
    ).toHaveAttribute("href", "/forgot-password");
    expect(
      screen.queryByRole("button", { name: /instagram/iu }),
    ).not.toBeInTheDocument();
  });

  it("renders a dedicated administrative login without public registration", async () => {
    const { container } = render(
      <LoginForm
        googleAction={vi.fn()}
        initialNextPath="/backoffice"
        mode="backoffice"
        signInAction={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Acesso exclusivo para administradores autorizados."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Criar conta" }),
    ).not.toBeInTheDocument();
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });

  it("preserves influencer intent in registration without exposing ADMIN", () => {
    const { container } = render(
      <SignUpForm
        googleAction={vi.fn()}
        initialIntent="INFLUENCER"
        signUpAction={vi.fn()}
      />,
    );

    expect(container.querySelector('input[name="intent"]')).toHaveValue(
      "INFLUENCER",
    );
    expect(screen.queryByText("ADMIN")).not.toBeInTheDocument();
  });

  it("allows password visibility without changing the submitted field", async () => {
    const user = userEvent.setup();

    render(
      <LoginForm
        googleAction={vi.fn()}
        initialNextPath="/onboarding/role"
        signInAction={vi.fn()}
      />,
    );

    const password = screen.getByLabelText("Senha");
    await user.click(screen.getByRole("button", { name: "Mostrar senha" }));

    expect(password).toHaveAttribute("type", "text");
    expect(password).toHaveAttribute("name", "password");
  });

  it("validates a field after the first blur and clears the error while correcting it", async () => {
    const user = userEvent.setup();
    const signInAction = vi.fn();

    render(
      <LoginForm
        googleAction={vi.fn()}
        initialNextPath="/onboarding/role"
        signInAction={signInAction}
      />,
    );

    const email = screen.getByLabelText("E-mail");
    const password = screen.getByLabelText("Senha");

    await user.click(email);
    await user.click(password);

    expect(signInAction).not.toHaveBeenCalled();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Preencha este campo.")).toBeInTheDocument();

    await user.type(email, "pessoa@exemplo.com");

    expect(email).toHaveAttribute("aria-invalid", "false");
    expect(
      within(email.closest('[data-slot="field"]')!).queryByText(
        "Preencha este campo.",
      ),
    ).not.toBeInTheDocument();
  });

  it("shows an invalid e-mail error on blur before submission", async () => {
    const user = userEvent.setup();
    const signInAction = vi.fn();

    render(
      <LoginForm
        googleAction={vi.fn()}
        initialNextPath="/onboarding/role"
        signInAction={signInAction}
      />,
    );

    const email = screen.getByLabelText("E-mail");
    await user.type(email, "email-invalido");
    await user.click(screen.getByLabelText("Senha"));

    expect(signInAction).not.toHaveBeenCalled();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Informe um e-mail válido.")).toBeInTheDocument();
  });

  it("compares sign-up passwords as soon as confirmation loses focus", async () => {
    const user = userEvent.setup();
    const signUpAction = vi.fn();

    render(
      <SignUpForm
        googleAction={vi.fn()}
        initialIntent="INFLUENCER"
        signUpAction={signUpAction}
      />,
    );

    const password = screen.getByLabelText("Senha");
    const confirmation = screen.getByLabelText("Confirmar senha");

    await user.type(password, "SenhaForte1");
    await user.type(confirmation, "SenhaForte2");
    await user.click(screen.getByLabelText("E-mail"));

    expect(signUpAction).not.toHaveBeenCalled();
    expect(confirmation).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("As senhas não coincidem.")).toBeInTheDocument();

    await user.clear(confirmation);
    await user.type(confirmation, "SenhaForte1");

    expect(confirmation).toHaveAttribute("aria-invalid", "false");
    expect(
      screen.queryByText("As senhas não coincidem."),
    ).not.toBeInTheDocument();
  });

  it("validates password strength on blur before sign-up submission", async () => {
    const user = userEvent.setup();
    const signUpAction = vi.fn();

    render(
      <SignUpForm
        googleAction={vi.fn()}
        initialIntent="INFLUENCER"
        signUpAction={signUpAction}
      />,
    );

    const password = screen.getByLabelText("Senha");
    await user.type(password, "fraca");
    await user.click(screen.getByLabelText("Confirmar senha"));

    expect(signUpAction).not.toHaveBeenCalled();
    expect(password).toHaveAttribute("aria-invalid", "true");
    expect(document.querySelector("#signup-password-error")).toHaveTextContent(
      "Use pelo menos 8 caracteres, com letras maiúsculas, minúsculas e um número.",
    );
  });

  it("marks empty required fields before calling the login action", async () => {
    const user = userEvent.setup();
    const signInAction = vi.fn();

    render(
      <LoginForm
        googleAction={vi.fn()}
        initialNextPath="/onboarding/role"
        signInAction={signInAction}
      />,
    );

    const email = screen.getByLabelText("E-mail");
    const password = screen.getByLabelText("Senha");

    expect(screen.getByText("Campos obrigatórios")).toBeInTheDocument();
    expect(
      email
        .closest('[data-slot="field"]')
        ?.querySelector('[data-slot="required-indicator"]'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(signInAction).not.toHaveBeenCalled();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(password).toHaveAttribute("aria-invalid", "true");
    expect(screen.getAllByText("Preencha este campo.")).toHaveLength(2);
    expect(email).toHaveFocus();
  });

  it("updates the recovery password with the browser Supabase session", async () => {
    const user = userEvent.setup();

    supabaseAuthMock.updateUser.mockResolvedValueOnce({ error: null });
    supabaseAuthMock.signOut.mockResolvedValueOnce({ error: null });

    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText("Nova senha"), "NovaSenha123");
    await user.type(
      screen.getByLabelText("Confirmar nova senha"),
      "NovaSenha123",
    );
    await user.click(screen.getByRole("button", { name: "Atualizar senha" }));

    expect(supabaseAuthMock.updateUser).toHaveBeenCalledWith({
      password: "NovaSenha123",
    });
    expect(supabaseAuthMock.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(
      await screen.findByRole("link", { name: "Entrar com a nova senha" }),
    ).toHaveAttribute("href", "/login");
  });

  it("exchanges a recovery link code in the browser before showing the password form", async () => {
    supabaseAuthMock.exchangeCodeForSession.mockResolvedValueOnce({
      error: null,
    });
    window.history.replaceState(null, "", "/reset-password?code=abc123");

    render(<ResetPasswordRecoveryGate code="abc123" />);

    expect(screen.getByText("Validando link de recuperação...")).toBeVisible();
    expect(supabaseAuthMock.exchangeCodeForSession).toHaveBeenCalledWith(
      "abc123",
    );
    expect(await screen.findByLabelText("Nova senha")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/reset-password");
    expect(window.location.search).toBe("");
  });

  it("keeps invalid recovery link codes from exposing the password form", async () => {
    supabaseAuthMock.exchangeCodeForSession.mockResolvedValueOnce({
      error: new Error("invalid code"),
    });

    render(<ResetPasswordRecoveryGate code="expired-code" />);

    expect(await screen.findByText("Link indisponível")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nova senha")).not.toBeInTheDocument();
  });

  it("has no serious or critical automated accessibility violations", async () => {
    const { container } = render(
      <LoginForm
        googleAction={vi.fn()}
        initialNextPath="/onboarding/role"
        signInAction={vi.fn()}
      />,
    );

    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });
});

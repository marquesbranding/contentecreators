import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import { LoginForm } from "./login-form.client";
import { SignUpForm } from "./sign-up-form.client";

vi.mock("next/image", () => ({
  default: ({
    alt = "",
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}));

describe("identity auth forms", () => {
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

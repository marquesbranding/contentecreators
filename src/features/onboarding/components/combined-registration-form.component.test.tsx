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

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import BackofficeError from "@/app/backoffice/(protected)/error";
import BackofficeLoading from "@/app/backoffice/(protected)/loading";
import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import { BackofficeActionFeedback } from "./backoffice-action-feedback";

describe("backoffice route feedback", () => {
  it("announces pending navigation while preserving the shell", async () => {
    const { container } = render(<BackofficeLoading />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Carregando conteúdo do backoffice",
    );
    expect(
      container.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(2);
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });

  it("offers an accessible retry without leaking the runtime error", async () => {
    const user = userEvent.setup();
    const unstableRetry = vi.fn();
    const error = Object.assign(new Error("segredo interno"), {
      digest: "safe-reference",
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(
      <BackofficeError error={error} unstable_retry={unstableRetry} />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Não foi possível carregar esta área",
      }),
    ).toBeVisible();
    expect(screen.queryByText("segredo interno")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(unstableRetry).toHaveBeenCalledOnce();
    expect(consoleSpy).toHaveBeenCalledWith(error);
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);

    consoleSpy.mockRestore();
  });

  it.each([
    ["success", "Alteração salva.", "status"],
    ["error", "Não foi possível salvar.", "alert"],
  ] as const)("announces %s action feedback", (kind, message, role) => {
    render(<BackofficeActionFeedback kind={kind} message={message} />);

    expect(screen.getByRole(role)).toHaveTextContent(message);
  });
});

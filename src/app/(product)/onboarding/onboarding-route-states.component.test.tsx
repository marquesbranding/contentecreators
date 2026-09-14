import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import OnboardingError from "./error";
import OnboardingLoading from "./loading";

describe("onboarding route states", () => {
  it("announces a lightweight loading skeleton", () => {
    render(<OnboardingLoading />);

    expect(
      screen.getByRole("status", {
        name: "Carregando formulário de cadastro",
      }),
    ).toHaveAttribute("aria-busy", "true");
  });

  it("offers safe recovery without exposing the server error", async () => {
    const user = userEvent.setup();
    const unstableRetry = vi.fn();
    const { container } = render(
      <OnboardingError
        error={new Error("private database detail")}
        unstable_retry={unstableRetry}
      />,
    );

    expect(container).not.toHaveTextContent("private database detail");
    expect(
      screen.getByRole("heading", { name: "Não foi possível abrir seu cadastro" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(unstableRetry).toHaveBeenCalledOnce();
  });
});

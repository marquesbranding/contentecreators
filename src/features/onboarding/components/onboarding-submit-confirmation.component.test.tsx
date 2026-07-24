import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { useSubmitConfirmation } from "@/shared/hooks/use-submit-confirmation";

import { OnboardingSubmitConfirmation } from "./onboarding-submit-confirmation";

function ConfirmationHarness({ onSubmit }: { onSubmit: () => void }) {
  const confirmation = useSubmitConfirmation();

  return (
    <>
      <form
        onSubmit={(event) => {
          confirmation.handleSubmit(event);
          if (!event.defaultPrevented) {
            event.preventDefault();
            onSubmit();
          }
        }}
      >
        <button type="submit">Enviar cadastro</button>
      </form>
      <OnboardingSubmitConfirmation
        onConfirm={confirmation.confirmSubmission}
        onOpenChange={confirmation.setOpen}
        open={confirmation.open}
      />
    </>
  );
}

describe("onboarding submit confirmation", () => {
  it("submits only after the user explicitly confirms", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ConfirmationHarness onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Enviar cadastro" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByRole("dialog", { name: "Enviar cadastro para análise?" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirmar envio" }));

    expect(onSubmit).toHaveBeenCalledOnce();
  });
});

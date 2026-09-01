import { render, screen } from "@testing-library/react";
import { Save } from "lucide-react";
import { describe, expect, it } from "vitest";

import { ActionSubmitButton } from "./action-submit-button";

describe("ActionSubmitButton", () => {
  it("renders the idle label and icon when no submission is running", () => {
    render(
      <ActionSubmitButton
        idleIcon={<Save aria-hidden="true" />}
        pending={false}
        pendingLabel="Salvando alterações"
      >
        Salvar
      </ActionSubmitButton>,
    );

    const button = screen.getByRole("button", { name: "Salvar" });

    expect(button).toBeEnabled();
    expect(button).toHaveAttribute("aria-busy", "false");
    expect(button).toHaveAttribute("data-submit-pending", "false");
    expect(button.querySelector("svg")).toBeInTheDocument();
  });

  it("shows the pulsing brand mascot and accessible progress label", () => {
    render(
      <ActionSubmitButton pending pendingLabel="Salvando alterações">
        Salvar
      </ActionSubmitButton>,
    );

    const button = screen.getByRole("button", {
      name: "Salvando alterações",
    });
    const image = button.querySelector("img");

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("data-submit-pending", "true");
    expect(image).toHaveAttribute(
      "src",
      "/brand/official/contente-creators-mascot.png",
    );
    expect(image?.parentElement).toHaveClass("submit-brand-pulse");
  });

  it("shows the same pulsing mascot regardless of button variant", () => {
    render(
      <ActionSubmitButton
        pending
        pendingLabel="Reenviando confirmação"
        variant="outline"
      >
        Reenviar
      </ActionSubmitButton>,
    );

    expect(
      screen
        .getByRole("button", { name: "Reenviando confirmação" })
        .querySelector("img"),
    ).toHaveAttribute("src", "/brand/official/contente-creators-mascot.png");
  });
});

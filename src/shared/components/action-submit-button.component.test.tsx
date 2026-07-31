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

  it("shows the official pulsing logo and accessible progress label", () => {
    render(
      <ActionSubmitButton pending pendingLabel="Salvando alterações">
        Salvar
      </ActionSubmitButton>,
    );

    const button = screen.getByRole("button", {
      name: "Salvando alterações",
    });
    const image = button.querySelector('img[alt="Contente Creators"]');

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("data-submit-pending", "true");
    expect(image).toHaveAttribute(
      "src",
      "/brand/official/contente-creators-white.png",
    );
    expect(image?.parentElement?.parentElement).toHaveClass(
      "submit-brand-pulse",
    );
  });

  it("uses the blue logo on an outline submit button", () => {
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
    ).toHaveAttribute("src", "/brand/official/contente-creators-blue.png");
  });
});

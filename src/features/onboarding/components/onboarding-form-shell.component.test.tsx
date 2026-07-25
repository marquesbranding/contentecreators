import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OnboardingFormShell } from "./onboarding-form-shell";

describe("onboarding form shell", () => {
  it("announces the current step and progress purpose", () => {
    render(
      <OnboardingFormShell
        currentStep={2}
        description="Dados necessários para análise."
        progressLabel="Dados do perfil"
        title="Complete seu cadastro"
        totalSteps={3}
      >
        <p>Formulário</p>
      </OnboardingFormShell>,
    );

    expect(screen.getByText("Etapa 2 de 3")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuetext",
      "Etapa 2 de 3: Dados do perfil",
    );
  });

  it("shows the exact correction guidance supplied by moderation", () => {
    render(
      <OnboardingFormShell
        correctionReason="Informe um endereço comercial completo e revise o nome fantasia."
        correctionRequested
        description="Dados necessários para análise."
        title="Revise seu cadastro"
      >
        <p>Formulário</p>
      </OnboardingFormShell>,
    );

    expect(screen.getByText("Correções solicitadas")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Informe um endereço comercial completo e revise o nome fantasia.",
      ),
    ).toBeInTheDocument();
  });
});

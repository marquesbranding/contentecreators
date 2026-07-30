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

  it("can defer the brand header to an authenticated product shell", () => {
    render(
      <OnboardingFormShell
        description="Dados públicos do perfil."
        showBrandHeader={false}
        title="Edite seu perfil"
      >
        <p>Formulário</p>
      </OnboardingFormShell>,
    );

    expect(
      screen.queryByRole("img", { name: "Contente Creators" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Edite seu perfil" }),
    ).toBeVisible();
  });
});

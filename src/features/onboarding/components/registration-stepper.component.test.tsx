import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RegistrationStepper } from "./registration-stepper.client";

const steps = [
  { label: "Dados de acesso" },
  { label: "Perfil" },
  { label: "Redes sociais" },
  { label: "Localização e termos" },
];

describe("registration stepper", () => {
  it("marca o passo atual com aria-current e anuncia a etapa", () => {
    render(<RegistrationStepper currentStep={2} steps={steps} />);

    expect(screen.getByText("Etapa 02 de 04 · Perfil")).toBeInTheDocument();

    const current = screen.getByText("02");
    expect(current).toHaveAttribute("aria-current", "step");
  });

  it("mostra check nos passos concluídos e numeração com dois dígitos nos futuros", () => {
    render(<RegistrationStepper currentStep={3} steps={steps} />);

    expect(
      screen.getByText("Etapa 03 de 04 · Redes sociais"),
    ).toBeInTheDocument();
    expect(screen.getByText("04")).toBeInTheDocument();
    expect(screen.queryByText("01")).not.toBeInTheDocument();
  });
});

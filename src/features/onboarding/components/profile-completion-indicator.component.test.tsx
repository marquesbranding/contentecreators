import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import { ProfileCompletionIndicator } from "./profile-completion-indicator";

describe("ProfileCompletionIndicator", () => {
  it("shows creator percentage and missing guidance in pt-BR", async () => {
    const { container } = render(
      <ProfileCompletionIndicator
        completion={{
          completedWeight: 69,
          missingFields: ["avatar", "cover"],
          percentage: 69,
          totalWeight: 100,
          version: 1,
        }}
        role="INFLUENCER"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Complete seu perfil" }),
    ).toBeVisible();
    expect(screen.getByText("69%")).toBeVisible();
    expect(screen.getByText("Adicionar foto de perfil")).toBeVisible();
    expect(screen.getByText("Adicionar imagem de capa")).toBeVisible();
    expect(screen.queryByText("avatar")).not.toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Conclusão do perfil: 69%" }),
    ).toHaveAttribute("aria-valuenow", "69");
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });

  it("uses company-specific labels without pressuring optional consent", () => {
    render(
      <ProfileCompletionIndicator
        completion={{
          completedWeight: 80,
          missingFields: ["logo", "cover", "socialProfile"],
          percentage: 80,
          totalWeight: 100,
          version: 1,
        }}
        role="COMPANY"
      />,
    );

    expect(screen.getByText("Adicionar o logo da empresa")).toBeVisible();
    expect(
      screen.getByText("Adicionar uma rede social da empresa"),
    ).toBeVisible();
    expect(
      screen.queryByText(/consentimento|visibilidade de contato/iu),
    ).not.toBeInTheDocument();
  });

  it("celebrates a complete profile without rendering an empty checklist", () => {
    render(
      <ProfileCompletionIndicator
        completion={{
          completedWeight: 100,
          missingFields: [],
          percentage: 100,
          totalWeight: 100,
          version: 1,
        }}
        role="INFLUENCER"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Perfil completo" }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Seu perfil reúne todos os itens previstos nesta versão.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});

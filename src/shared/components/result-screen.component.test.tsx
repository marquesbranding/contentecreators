import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import { ResultScreen } from "./result-screen";

describe("ResultScreen", () => {
  it("shows the title, description and details for a success tone", async () => {
    const { container } = render(
      <ResultScreen
        description="Recebemos suas informações."
        details={<p>Você receberá um e-mail em breve.</p>}
        primaryAction={{ href: "/app/catalog", label: "Ir para o catálogo" }}
        secondaryAction={{ href: "/app/profile", label: "Editar perfil" }}
        title="Cadastro enviado para análise"
        tone="success"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Cadastro enviado para análise" }),
    ).toBeVisible();
    expect(screen.getByText("Recebemos suas informações.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Ir para o catálogo" })).toHaveAttribute(
      "href",
      "/app/catalog",
    );
    expect(screen.getByRole("link", { name: "Editar perfil" })).toHaveAttribute(
      "href",
      "/app/profile",
    );
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });

  it("renders an onClick primary action as a button instead of a link", () => {
    const onRetry = vi.fn();
    render(
      <ResultScreen
        primaryAction={{ label: "Tentar de novo", onClick: onRetry }}
        title="Não foi possível concluir"
        tone="error"
      />,
    );

    const button = screen.getByRole("button", { name: "Tentar de novo" });
    button.click();

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders without actions or details", () => {
    render(<ResultScreen title="Processando seu cadastro" tone="processing" />);

    expect(
      screen.getByRole("heading", { name: "Processando seu cadastro" }),
    ).toBeVisible();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

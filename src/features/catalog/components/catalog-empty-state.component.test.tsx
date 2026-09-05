import { SearchX } from "lucide-react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CatalogEmptyState } from "./catalog-empty-state";

describe("CatalogEmptyState", () => {
  it("renders the title, description and actions passed in", () => {
    render(
      <CatalogEmptyState
        actions={<button type="button">Limpar filtros</button>}
        description="Remova um filtro ou amplie a busca."
        icon={SearchX}
        title="Nenhum perfil com esses filtros"
        tone="filtered"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Nenhum perfil com esses filtros" }),
    ).toBeVisible();
    expect(
      screen.getByText("Remova um filtro ou amplie a busca."),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Limpar filtros" }),
    ).toBeVisible();
  });

  it("renders without actions", () => {
    render(
      <CatalogEmptyState
        description="Assim que a equipe aprovar o primeiro perfil, ele aparece aqui."
        icon={SearchX}
        title="Ainda não há perfis aprovados"
        tone="first"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Ainda não há perfis aprovados" }),
    ).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

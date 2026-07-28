import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import {
  CatalogFilterControls,
  type CatalogFilterOptions,
} from "./catalog-filter-controls.client";

const options: CatalogFilterOptions = {
  cities: ["Campinas", "São Paulo"],
  niches: [
    { label: "Beleza", value: "beleza" },
    { label: "Tecnologia", value: "tecnologia" },
  ],
  states: ["MG", "SP"],
};

describe("CatalogFilterControls", () => {
  it("submits the search, exposes active filters and clears them", async () => {
    const user = userEvent.setup();
    const onClearFilters = vi.fn();
    const onRemoveFilter = vi.fn();
    const onSearchSubmit = vi.fn();

    render(
      <CatalogFilterControls
        activeFilters={[
          { key: "niche", label: "Nicho: Beleza" },
          { key: "state", label: "UF: SP" },
        ]}
        filters={{
          niche: "beleza",
          pageSize: 20,
          search: "marina",
          state: "SP",
        }}
        onClearFilters={onClearFilters}
        onFiltersChange={vi.fn()}
        onRemoveFilter={onRemoveFilter}
        onSearchSubmit={onSearchSubmit}
        options={options}
      />,
    );

    const search = screen.getByRole("searchbox", {
      name: "Buscar criadores",
    });
    await user.clear(search);
    await user.type(search, "conteúdo");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(onSearchSubmit).toHaveBeenCalledWith("conteúdo");
    expect(screen.getByText("Nicho: Beleza")).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Remover filtro Nicho: Beleza" }),
    );
    expect(onRemoveFilter).toHaveBeenCalledWith("niche");

    await user.click(
      screen.getByRole("button", { name: "Limpar todos os filtros" }),
    );
    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  it("offers semantically equivalent touch-friendly filters in a mobile sheet", async () => {
    const user = userEvent.setup();

    render(
      <CatalogFilterControls
        activeFilters={[]}
        filters={{ pageSize: 20 }}
        onClearFilters={vi.fn()}
        onFiltersChange={vi.fn()}
        onRemoveFilter={vi.fn()}
        onSearchSubmit={vi.fn()}
        options={options}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Abrir filtros do catálogo" }),
    );

    const sheet = await screen.findByRole("dialog");
    expect(
      within(sheet).getByRole("heading", { name: "Filtrar criadores" }),
    ).toBeVisible();
    expect(within(sheet).getByLabelText("Tipo de criador")).toBeVisible();
    expect(within(sheet).getByLabelText("Nicho")).toBeVisible();
    expect(within(sheet).getByLabelText("Rede social")).toBeVisible();
    expect(within(sheet).getByLabelText("Cidade")).toBeVisible();
    expect(within(sheet).getByLabelText("UF")).toBeVisible();

    await user.click(
      within(sheet).getByRole("button", { name: "Mostrar resultados" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Abrir filtros do catálogo" }),
    ).toHaveFocus();
  });

  it("announces pending filter updates and has no blocking accessibility violations", async () => {
    const { container } = render(
      <CatalogFilterControls
        activeFilters={[]}
        filters={{ pageSize: 20 }}
        isPending
        onClearFilters={vi.fn()}
        onFiltersChange={vi.fn()}
        onRemoveFilter={vi.fn()}
        onSearchSubmit={vi.fn()}
        options={options}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Atualizando resultados",
    );
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });
});

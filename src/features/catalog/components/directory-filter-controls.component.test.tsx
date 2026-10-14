import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DirectoryFilterControls } from "./directory-filter-controls.client";

const emptyOptions = { cities: [], niches: [], segments: [], states: [] };

describe("DirectoryFilterControls", () => {
  it("opens the modal and toggles a type checkbox", async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();

    render(
      <DirectoryFilterControls
        activeFilters={[]}
        filters={{ pageSize: 20 }}
        onClearFilters={vi.fn()}
        onFiltersChange={onFiltersChange}
        onRemoveFilter={vi.fn()}
        options={emptyOptions}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Abrir filtros do catálogo" }),
    );

    expect(
      screen.getByRole("heading", { name: "Filtrar catálogo" }),
    ).toBeVisible();

    await user.click(screen.getByRole("checkbox", { name: "Empresa" }));

    expect(onFiltersChange).toHaveBeenCalledWith({ type: ["COMPANY"] });
  });

  it("hides the follower range fields without a platform selected", async () => {
    const user = userEvent.setup();

    render(
      <DirectoryFilterControls
        activeFilters={[]}
        filters={{ pageSize: 20 }}
        onClearFilters={vi.fn()}
        onFiltersChange={vi.fn()}
        onRemoveFilter={vi.fn()}
        options={emptyOptions}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Abrir filtros do catálogo" }),
    );

    expect(
      screen.queryByLabelText("Seguidores (mínimo)"),
    ).not.toBeInTheDocument();
  });

  it("reveals the follower range fields when Instagram is selected", async () => {
    const user = userEvent.setup();

    render(
      <DirectoryFilterControls
        activeFilters={[]}
        filters={{ pageSize: 20, platform: "INSTAGRAM" }}
        onClearFilters={vi.fn()}
        onFiltersChange={vi.fn()}
        onRemoveFilter={vi.fn()}
        options={emptyOptions}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Abrir filtros do catálogo" }),
    );

    expect(screen.getByLabelText("Seguidores (mínimo)")).toBeVisible();
  });

  it("removes a single selected type from the active filter badges", async () => {
    const user = userEvent.setup();
    const onRemoveFilter = vi.fn();

    render(
      <DirectoryFilterControls
        activeFilters={[
          { key: "type", label: "Tipo: Empresa", value: "COMPANY" },
          { key: "type", label: "Tipo: UGC", value: "UGC" },
        ]}
        filters={{ pageSize: 20, type: ["COMPANY", "UGC"] }}
        onClearFilters={vi.fn()}
        onFiltersChange={vi.fn()}
        onRemoveFilter={onRemoveFilter}
        options={emptyOptions}
      />,
    );

    const activeFiltersGroup = screen.getByRole("group", {
      name: "Filtros ativos",
    });
    await user.click(
      within(activeFiltersGroup).getByRole("button", {
        name: "Remover filtro Tipo: Empresa",
      }),
    );

    expect(onRemoveFilter).toHaveBeenCalledWith("type", "COMPANY");
  });

  it("offers the Selos checkboxes and reports them as seal filters", async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();

    render(
      <DirectoryFilterControls
        activeFilters={[]}
        filters={{ pageSize: 20 }}
        onClearFilters={vi.fn()}
        onFiltersChange={onFiltersChange}
        onRemoveFilter={vi.fn()}
        options={emptyOptions}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Abrir filtros do catálogo" }),
    );

    expect(screen.getByRole("group", { name: "Selos" })).toBeVisible();

    await user.click(
      screen.getByRole("checkbox", { name: "Associado da CDL" }),
    );
    expect(onFiltersChange).toHaveBeenLastCalledWith({ cdl: true });

    await user.click(
      screen.getByRole("checkbox", { name: "Fez a Jornada do Influenciador" }),
    );
    expect(onFiltersChange).toHaveBeenLastCalledWith({ jornada: true });
  });

  it("reflects active seal filters and clears them when unchecked", async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();

    render(
      <DirectoryFilterControls
        activeFilters={[{ key: "cdl", label: "Associado da CDL" }]}
        filters={{ cdl: true, pageSize: 20 }}
        onClearFilters={vi.fn()}
        onFiltersChange={onFiltersChange}
        onRemoveFilter={vi.fn()}
        options={emptyOptions}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Abrir filtros do catálogo" }),
    );

    const cdlCheckbox = screen.getByRole("checkbox", {
      name: "Associado da CDL",
    });
    expect(cdlCheckbox).toBeChecked();

    await user.click(cdlCheckbox);
    expect(onFiltersChange).toHaveBeenLastCalledWith({ cdl: undefined });
  });
});

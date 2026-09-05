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
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import type { CatalogCreatorCardViewModel } from "./catalog-creator-card";
import { CatalogResults } from "./catalog-results";

const creator: CatalogCreatorCardViewModel = {
  bioExcerpt: "Conteúdo de tecnologia para marcas.",
  city: "Belo Horizonte",
  creatorId: "10000000-0000-4000-8000-000000000001",
  creatorType: "INFLUENCER",
  detailHref: "/app/creators/10000000-0000-4000-8000-000000000001",
  displayName: "Ana Criadora",
  media: null,
  metrics: [],
  niches: [{ name: "Tecnologia", slug: "tecnologia" }],
  socialPlatforms: ["YOUTUBE"],
  state: "MG",
};

describe("CatalogResults", () => {
  it("renders responsive results and an accessible fetch-next state", async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();
    const { rerender } = render(
      <CatalogResults
        hasNextPage
        items={[creator]}
        onLoadMore={onLoadMore}
        status="success"
      />,
    );

    expect(screen.getByText("1 criador nesta página")).toBeVisible();
    expect(
      screen.getByRole("list", { name: "Lista de criadores" }),
    ).toHaveClass("grid-cols-1", "sm:grid-cols-2", "xl:grid-cols-3");
    await user.click(screen.getByRole("button", { name: "Carregar mais" }));
    expect(onLoadMore).toHaveBeenCalledOnce();

    rerender(
      <CatalogResults
        hasNextPage
        isFetchingNextPage
        items={[creator]}
        onLoadMore={onLoadMore}
        status="success"
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Carregando mais criadores",
    );
    expect(
      screen.getByRole("button", { name: "Carregando mais" }),
    ).toBeDisabled();
  });

  it("distinguishes the first-empty and filtered-empty guidance", async () => {
    const user = userEvent.setup();
    const onClearFilters = vi.fn();
    const { rerender } = render(<CatalogResults items={[]} status="success" />);

    expect(screen.getByText("O catálogo está começando")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Limpar filtros" }),
    ).not.toBeInTheDocument();

    rerender(
      <CatalogResults
        hasActiveFilters
        items={[]}
        onClearFilters={onClearFilters}
        status="success"
      />,
    );
    expect(screen.getByText("Nenhum criador encontrado")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  it("removes stale protected cards on error and offers retry", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <CatalogResults items={[creator]} onRetry={onRetry} status="error" />,
    );

    expect(screen.queryByText("Ana Criadora")).not.toBeInTheDocument();
    expect(
      screen.getByText("Não foi possível carregar o catálogo"),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("uses a labelled skeleton and has no blocking accessibility violations", async () => {
    const { container } = render(
      <CatalogResults items={[]} status="loading" />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Carregando criadores",
    );
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });
});

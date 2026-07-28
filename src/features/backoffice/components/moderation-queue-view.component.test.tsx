import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import type {
  ModerationQueueFilters,
  ModerationQueueResponseDto,
} from "../types/moderation-queue.types";
import { ModerationQueueView } from "./moderation-queue-view.client";

const filters: ModerationQueueFilters = {
  order: "PENDING_FIRST",
  page: 1,
  pageSize: 20,
  role: "INFLUENCER",
  search: "",
  status: undefined,
};

const response: ModerationQueueResponseDto = {
  counts: {
    byRole: { COMPANY: 4, INFLUENCER: 7 },
    byStatus: {
      APPROVED: 10,
      BANNED: 1,
      CHANGES_REQUESTED: 2,
      PENDING_REVIEW: 5,
      SUSPENDED: 3,
    },
  },
  items: [],
  pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
};

describe("ModerationQueueView", () => {
  it("submits search and role filters while resetting pagination", async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    render(
      <ModerationQueueView
        filters={{ ...filters, page: 3 }}
        onFiltersChange={onFiltersChange}
        query={{ data: response, status: "success" }}
      />,
    );

    await user.type(
      screen.getByRole("searchbox", { name: "Buscar cadastro" }),
      "Criadora",
    );
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    await user.click(screen.getByRole("button", { name: "Empresas" }));

    expect(onFiltersChange).toHaveBeenNthCalledWith(1, {
      ...filters,
      page: 1,
      search: "Criadora",
    });
    expect(onFiltersChange).toHaveBeenNthCalledWith(2, {
      ...filters,
      page: 1,
      role: "COMPANY",
    });
  });

  it("announces a safe recoverable error", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    render(
      <ModerationQueueView
        filters={filters}
        onFiltersChange={vi.fn()}
        query={{ retry, status: "error" }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar a fila",
    );
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("renders accessible queue counts and loading feedback", async () => {
    const { container, rerender } = render(
      <ModerationQueueView
        filters={filters}
        onFiltersChange={vi.fn()}
        query={{ status: "loading" }}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Carregando fila de moderação",
    );

    rerender(
      <ModerationQueueView
        filters={filters}
        onFiltersChange={vi.fn()}
        query={{ data: response, status: "success" }}
      />,
    );

    expect(screen.getByText("7 influenciadores")).toBeVisible();
    expect(screen.getByText("4 empresas")).toBeVisible();
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import type {
  AdminEmailOutboxFilters,
  AdminEmailOutboxListDto,
} from "../types/admin-email-outbox.types";
import { AdminEmailOutboxView } from "./admin-email-outbox-view.client";

const filters: AdminEmailOutboxFilters = {
  order: "ATTENTION_FIRST",
  page: 1,
  pageSize: 20,
  status: undefined,
  template: undefined,
};
const emptyList: AdminEmailOutboxListDto = {
  counts: { DEAD_LETTER: 2, FAILED: 3, PENDING: 4 },
  items: [],
  pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
};

function renderView(
  query:
    | { status: "error"; retry: () => void }
    | { status: "loading" }
    | { status: "success"; data: AdminEmailOutboxListDto },
  onFiltersChange = vi.fn(),
) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AdminEmailOutboxView
        filters={filters}
        onFiltersChange={onFiltersChange}
        query={query}
        retryAction={vi.fn()}
      />
    </QueryClientProvider>,
  );
}

describe("AdminEmailOutboxView", () => {
  it("updates URL-owned filters while resetting pagination", async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    renderView({ data: emptyList, status: "success" }, onFiltersChange);

    const statusCombobox = screen.getByRole("combobox", { name: "Status" });
    await user.click(statusCombobox);
    await user.clear(statusCombobox);
    await user.type(statusCombobox, "Falha");
    const option = await screen.findByRole("option", {
      name: "Falha definitiva",
    });
    await user.click(option);

    expect(onFiltersChange).toHaveBeenCalledWith({
      ...filters,
      page: 1,
      status: "DEAD_LETTER",
    });
  });

  it("shows operational counts, privacy guidance and safe errors", async () => {
    const retry = vi.fn();
    const { container, rerender } = renderView({
      data: emptyList,
      status: "success",
    });

    expect(screen.getByText("4 pendentes")).toBeVisible();
    expect(screen.getByText("3 tentativas automáticas")).toBeVisible();
    expect(screen.getByText("2 falhas definitivas")).toBeVisible();
    expect(
      screen.getByText(/endereços e conteúdo das mensagens/iu),
    ).toBeVisible();

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <AdminEmailOutboxView
          filters={filters}
          onFiltersChange={vi.fn()}
          query={{ retry, status: "error" }}
          retryAction={vi.fn()}
        />
      </QueryClientProvider>,
    );
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });
});

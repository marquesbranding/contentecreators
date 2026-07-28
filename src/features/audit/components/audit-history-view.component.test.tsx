import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import type {
  AuditHistoryFilters,
  AuditHistoryResponseDto,
} from "../types/audit-history.types";
import { AuditHistoryView } from "./audit-history-view.client";

const filters: AuditHistoryFilters = {
  page: 3,
  pageSize: 20,
};
const emptyResponse: AuditHistoryResponseDto = {
  items: [],
  pagination: {
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
  },
};

describe("AuditHistoryView", () => {
  it("owns filters in the URL contract and resets pagination", async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    render(
      <AuditHistoryView
        filters={filters}
        onFiltersChange={onFiltersChange}
        query={{ data: emptyResponse, status: "success" }}
      />,
    );

    await user.type(screen.getByLabelText("Entidade"), "accounts");
    await user.type(screen.getByLabelText("ID do registro"), "record-1");
    await user.type(
      screen.getByLabelText("ID da conta do ator"),
      "a0000000-0000-4000-8000-000000000001",
    );
    await user.type(screen.getByLabelText("Data inicial"), "2026-07-01");
    await user.type(screen.getByLabelText("Data final"), "2026-07-31");
    await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));

    expect(onFiltersChange).toHaveBeenCalledWith({
      action: undefined,
      actorAccountId: "a0000000-0000-4000-8000-000000000001",
      actorType: undefined,
      entity: "accounts",
      page: 1,
      pageSize: 20,
      periodFrom: "2026-07-01",
      periodTo: "2026-07-31",
      record: "record-1",
      source: undefined,
    });

    await user.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(onFiltersChange).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 20,
    });
  });

  it("announces loading and offers a recoverable safe error", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    const { rerender } = render(
      <AuditHistoryView
        filters={filters}
        onFiltersChange={vi.fn()}
        query={{ status: "loading" }}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Carregando histórico de auditoria",
    );

    rerender(
      <AuditHistoryView
        filters={filters}
        onFiltersChange={vi.fn()}
        query={{ retry, status: "error" }}
      />,
    );

    expect(
      screen.getByText("Não foi possível carregar a auditoria"),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("explains immutability and has no blocking accessibility violations", async () => {
    const { container } = render(
      <AuditHistoryView
        filters={filters}
        onFiltersChange={vi.fn()}
        query={{ data: emptyResponse, status: "success" }}
      />,
    );

    expect(screen.getByText("Histórico somente para consulta")).toBeVisible();
    expect(
      screen.getByText(/não podem ser editados ou excluídos/iu),
    ).toBeVisible();
    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });
});

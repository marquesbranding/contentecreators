import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import type { AuditHistoryResponseDto } from "../types/audit-history.types";
import { AuditHistoryResults } from "./audit-history-results";

const history: AuditHistoryResponseDto = {
  items: [
    {
      action: "UPDATE",
      actor: {
        accountId: "a0000000-0000-4000-8000-000000000001",
        actorType: "ADMIN",
        role: "ADMIN",
      },
      changes: [
        {
          after: "APPROVED",
          before: "PENDING_REVIEW",
          field: "status",
        },
        {
          after: "[REDACTED]",
          before: "[REDACTED]",
          field: "operational_email",
        },
      ],
      entity: "accounts",
      occurredAt: "2026-07-28T12:00:00.000Z",
      reason: "Aprovação manual",
      record: "b0000000-0000-4000-8000-000000000001",
      requestId: "audit-request-42",
      revision: 42,
      source: "BACKOFFICE",
    },
  ],
  pagination: {
    page: 2,
    pageSize: 20,
    totalItems: 41,
    totalPages: 3,
  },
};

describe("AuditHistoryResults", () => {
  it("renders equivalent immutable desktop and mobile revision details", async () => {
    const user = userEvent.setup();
    render(<AuditHistoryResults response={history} />);

    const desktop = screen.getByLabelText("Histórico de auditoria em tabela");
    const mobile = screen.getByLabelText("Histórico de auditoria em cartões");

    for (const presentation of [desktop, mobile]) {
      expect(within(presentation).getByText("Contas")).toBeVisible();
      expect(within(presentation).getByText("Atualização")).toBeVisible();
      await user.click(within(presentation).getByText("Ver alterações (2)"));
      expect(within(presentation).getByText("Aprovação manual")).toBeVisible();
      expect(
        within(presentation).getByText("Aguardando análise"),
      ).toBeVisible();
      expect(within(presentation).getByText("Aprovado")).toBeVisible();
      expect(
        within(presentation).queryByText("PENDING_REVIEW"),
      ).not.toBeInTheDocument();
      expect(
        within(presentation).queryByText("APPROVED"),
      ).not.toBeInTheDocument();
      expect(within(presentation).getAllByText("Dado protegido")).toHaveLength(
        2,
      );
    }

    expect(
      screen.queryByRole("button", { name: /editar|excluir|salvar/iu }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("offers bounded previous/next navigation only", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <AuditHistoryResults onPageChange={onPageChange} response={history} />,
    );

    await user.click(screen.getByRole("button", { name: "Página anterior" }));
    await user.click(screen.getByRole("button", { name: "Próxima página" }));

    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
  });

  it("has no blocking accessibility violations", async () => {
    const { container } = render(<AuditHistoryResults response={history} />);

    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });
});

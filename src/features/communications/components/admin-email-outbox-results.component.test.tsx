import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { AdminEmailOutboxListDto } from "../types/admin-email-outbox.types";
import { AdminEmailOutboxResults } from "./admin-email-outbox-results";

const retryAction = vi.fn(async () => ({ status: "success" as const }));
const response: AdminEmailOutboxListDto = {
  counts: { DEAD_LETTER: 1, FAILED: 1, PENDING: 0 },
  items: [
    {
      attemptCount: 5,
      createdAt: "2026-07-28T12:00:00.000Z",
      dueAt: "2026-07-28T13:00:00.000Z",
      id: "90000000-0000-4000-8000-000000000001",
      maxAttempts: 5,
      recipientReference: "Conta 00000001",
      reference: "E-mail #90000000",
      retry: { eligible: true, reason: "ELIGIBLE" },
      status: "DEAD_LETTER",
      template: "APPROVED",
      updatedAt: "2026-07-28T12:05:00.000Z",
    },
    {
      attemptCount: 2,
      createdAt: "2026-07-28T12:10:00.000Z",
      dueAt: "2026-07-28T13:10:00.000Z",
      id: "91000000-0000-4000-8000-000000000002",
      maxAttempts: 5,
      recipientReference: "Conta 00000002",
      reference: "E-mail #91000000",
      retry: { eligible: false, reason: "AUTOMATIC_RETRY" },
      status: "FAILED",
      template: "CHANGES_REQUESTED",
      updatedAt: "2026-07-28T12:15:00.000Z",
    },
  ],
  pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
};

function renderResults() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AdminEmailOutboxResults response={response} retryAction={retryAction} />
    </QueryClientProvider>,
  );
}

describe("AdminEmailOutboxResults", () => {
  it("renders equivalent operational data in desktop and mobile presentations", () => {
    renderResults();

    for (const presentation of [
      screen.getByLabelText("E-mails operacionais em tabela"),
      screen.getByLabelText("E-mails operacionais em cartões"),
    ]) {
      expect(within(presentation).getByText("Cadastro aprovado")).toBeVisible();
      expect(within(presentation).getByText("Falha definitiva")).toBeVisible();
      expect(within(presentation).getByText("Conta 00000001")).toBeVisible();
      expect(
        within(presentation).getByText(/preservando a mesma mensagem/iu),
      ).toBeVisible();
      expect(
        within(presentation).getByRole("button", {
          name: /tentar novamente e-mail #90000000/iu,
        }),
      ).toBeVisible();
    }

    expect(screen.queryByText(/@/u)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/corpo|payload|idempotency/iu),
    ).not.toBeInTheDocument();
  });

  it("does not offer manual retry while automatic processing remains active", () => {
    renderResults();
    const automaticCards = screen.getAllByText(
      /fará uma nova tentativa automaticamente/iu,
    );

    expect(automaticCards).toHaveLength(2);
    expect(
      screen.queryByRole("button", {
        name: "Tentar novamente E-mail #91000000",
      }),
    ).not.toBeInTheDocument();
  });

  it("paginates without selecting or bulk-retrying messages", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AdminEmailOutboxResults
          onPageChange={onPageChange}
          response={{
            ...response,
            pagination: { ...response.pagination, page: 2, totalPages: 3 },
          }}
          retryAction={retryAction}
        />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Página anterior" }));
    await user.click(screen.getByRole("button", { name: "Próxima página" }));

    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
    expect(
      screen.queryByRole("checkbox", { name: /selecionar/iu }),
    ).not.toBeInTheDocument();
  });
});

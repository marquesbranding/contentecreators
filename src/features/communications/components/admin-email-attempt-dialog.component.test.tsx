import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { AdminEmailOutboxDetailDto } from "../types/admin-email-outbox.types";
import { AdminEmailAttemptDialogView } from "./admin-email-attempt-dialog.client";

const detail: AdminEmailOutboxDetailDto = {
  attempts: [
    {
      attemptNumber: 5,
      attemptedAt: "2026-07-28T12:05:00.000Z",
      latencyMs: 900,
      outcome: "TIMEOUT_FAILURE",
      status: "FAILED",
    },
  ],
  item: {
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
};

describe("AdminEmailAttemptDialogView", () => {
  it("shows minimized attempt details and retry eligibility", async () => {
    render(
      <AdminEmailAttemptDialogView
        onOpenChange={vi.fn()}
        open
        query={{ data: detail, status: "success" }}
        reference="E-mail #90000000"
      />,
    );

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Tempo limite excedido",
    );
    expect(screen.getByRole("dialog")).toHaveTextContent("Tentativa 5");
    expect(screen.getByRole("dialog")).toHaveTextContent(
      /permite uma nova tentativa manual/iu,
    );
    expect(screen.getByRole("dialog")).not.toHaveTextContent(
      /@|payload|token/iu,
    );
  });

  it("announces loading and safe recoverable errors", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    const { rerender } = render(
      <AdminEmailAttemptDialogView
        onOpenChange={vi.fn()}
        open
        query={{ status: "loading" }}
        reference="E-mail #90000000"
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Carregando histórico de tentativas",
    );
    rerender(
      <AdminEmailAttemptDialogView
        onOpenChange={vi.fn()}
        open
        query={{ retry, status: "error" }}
        reference="E-mail #90000000"
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Tentar carregar novamente" }),
    );
    expect(retry).toHaveBeenCalledOnce();
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import { ModerationActionPanel } from "./moderation-action-panel.client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const actions = {
  APPROVE: vi.fn(),
  ARCHIVE: vi.fn(),
  BAN: vi.fn(),
  REQUEST_CHANGES: vi.fn(),
  RESTORE: vi.fn(),
  SUSPEND: vi.fn(),
  UNBAN: vi.fn(),
};

function renderPanel(element: ReactNode) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false } },
        })
      }
    >
      {element}
    </QueryClientProvider>,
  );
}

describe("ModerationActionPanel", () => {
  it("shows only individual actions allowed for a pending review", async () => {
    const user = userEvent.setup();
    renderPanel(
      <ModerationActionPanel
        accountId="10000000-0000-4000-8000-000000000001"
        accountVersion={3}
        actions={actions}
        displayName="Criadora Teste"
        profileVersion={2}
        status="PENDING_REVIEW"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Aprovar cadastro" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Solicitar correções" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Banir cadastro" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Arquivar cadastro" }),
    ).toBeVisible();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/em massa|selecionados/iu),
    ).not.toBeInTheDocument();

    const requestChangesButton = screen.getByRole("button", {
      name: "Solicitar correções",
    });
    requestChangesButton.focus();
    await user.keyboard("{Enter}");

    expect(
      screen.getByRole("dialog", { name: "Solicitar correções" }),
    ).toBeVisible();
    expect(
      screen.getByLabelText(/motivo para solicitar correções/iu),
    ).toBeRequired();
    expect(
      screen.getByRole("checkbox", {
        name: /confirmo que revisei o cadastro/iu,
      }),
    ).toHaveAttribute("aria-required", "true");
    expect(
      document.querySelectorAll("[data-slot=required-indicator]").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("explains the consequence of restoring a suspended account", async () => {
    const user = userEvent.setup();
    renderPanel(
      <ModerationActionPanel
        accountId="10000000-0000-4000-8000-000000000001"
        accountVersion={4}
        actions={actions}
        displayName="Empresa Teste"
        profileVersion={3}
        status="SUSPENDED"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Restaurar acesso" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Aprovar cadastro" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Restaurar acesso" }));
    expect(
      screen.getByText(/voltará ao catálogo e recuperará o acesso/iu),
    ).toBeVisible();
  });

  it("has no blocking accessibility violations", async () => {
    const { container } = renderPanel(
      <ModerationActionPanel
        accountId="10000000-0000-4000-8000-000000000001"
        accountVersion={3}
        actions={actions}
        displayName="Criadora Teste"
        profileVersion={2}
        status="PENDING_REVIEW"
      />,
    );

    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });
});

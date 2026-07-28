import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { getBlockingComponentAccessibilityViolations } from "@/test/component-accessibility";

import { AdminEmailRetryDialog } from "./admin-email-retry-dialog.client";

describe("AdminEmailRetryDialog", () => {
  it("requires an explicit reason and confirmation and submits the same item identity", async () => {
    const user = userEvent.setup();
    const action = vi.fn(
      async (
        _state: { status: "error" | "idle" | "success"; message?: string },
        formData: FormData,
      ) => {
        expect(formData.get("outboxId")).toBe(
          "90000000-0000-4000-8000-000000000001",
        );
        expect(formData.get("reason")).toBe(
          "Provedor normalizado após manutenção",
        );
        return {
          message: "Nova tentativa de envio processada.",
          status: "success" as const,
        };
      },
    );
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AdminEmailRetryDialog
          action={action}
          outboxId="90000000-0000-4000-8000-000000000001"
          reference="E-mail #90000000"
        />
      </QueryClientProvider>,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Tentar novamente E-mail #90000000",
      }),
    );

    expect(screen.getByRole("dialog")).toHaveTextContent(
      /não cria uma nova mensagem/iu,
    );
    expect(screen.getByLabelText("Motivo do reenvio")).toBeRequired();
    expect(
      screen.getByRole("checkbox", {
        name: /confirmo que investiguei a falha/iu,
      }),
    ).toHaveAttribute("aria-required", "true");
    expect(
      document.querySelectorAll("[data-slot=required-indicator]").length,
    ).toBeGreaterThanOrEqual(2);

    await user.type(
      screen.getByLabelText("Motivo do reenvio"),
      "Provedor normalizado após manutenção",
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: /confirmo que investiguei a falha/iu,
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirmar nova tentativa" }),
    );

    expect(action).toHaveBeenCalledOnce();
    expect(
      await screen.findByText("Nova tentativa de envio processada."),
    ).toBeVisible();
  });

  it("has no blocking accessibility violations", async () => {
    const { container } = render(
      <QueryClientProvider client={new QueryClient()}>
        <AdminEmailRetryDialog
          action={vi.fn()}
          outboxId="90000000-0000-4000-8000-000000000001"
          reference="E-mail #90000000"
        />
      </QueryClientProvider>,
    );

    expect(
      await getBlockingComponentAccessibilityViolations(container),
    ).toEqual([]);
  });
});

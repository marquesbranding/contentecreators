import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CnpjLookupFeedback } from "./cnpj-lookup-feedback";

describe("CnpjLookupFeedback", () => {
  it.each([
    ["loading", "Consultando o CNPJ"],
    ["not_found", "CNPJ não encontrado"],
    ["timeout", "A consulta demorou mais que o esperado"],
    ["rate_limited", "Limite de consultas atingido"],
    ["unavailable", "Consulta automática indisponível"],
  ] as const)("announces the %s state in pt-BR", (status, title) => {
    render(
      <CnpjLookupFeedback
        lookupStatus={status}
        onApply={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(title);
    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "polite");
    if (status === "loading") {
      expect(screen.getByRole("alert")).toHaveAttribute("aria-busy", "true");
    } else {
      expect(screen.getByRole("alert")).not.toHaveAttribute("aria-busy");
    }
  });

  it("lets the user apply a successful editable proposal", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(
      <CnpjLookupFeedback
        lookupStatus="success"
        onApply={onApply}
        onRetry={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Preencher novamente" }),
    );

    expect(onApply).toHaveBeenCalledOnce();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Dados preenchidos automaticamente",
    );
  });

  it("offers a retry after timeout and keeps manual completion explicit", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <CnpjLookupFeedback
        lookupStatus="timeout"
        onApply={vi.fn()}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText(/Preenchimento manual disponível/iu)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

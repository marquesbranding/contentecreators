import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { AccountDeletionSection } from "./account-deletion-section.client";
import { RecoverAccountPanel } from "./recover-account-panel.client";

describe("AccountDeletionSection", () => {
  it("explains consequences and windows before asking for confirmation", async () => {
    render(
      <AccountDeletionSection
        action={vi.fn().mockResolvedValue({ status: "idle" })}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Excluir conta" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/em até 30 dias/u)).toBeInTheDocument();
    expect(screen.getByText(/em até 120 dias/u)).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Excluir minha conta" }),
    );

    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Digite EXCLUIR para confirmar/u),
    ).toBeRequired();
    expect(
      screen.getByRole("checkbox", { name: /Entendo que meu perfil/u }),
    ).toBeRequired();
  });

  it("shows the server message and field errors", async () => {
    const action = vi.fn().mockResolvedValue({
      code: "INVALID_PASSWORD",
      fieldErrors: { password: ["Senha incorreta."] },
      message: "Confirme sua senha para excluir a conta.",
      status: "error",
    });
    render(<AccountDeletionSection action={action} />);

    await userEvent.click(
      screen.getAllByRole("button", { name: "Excluir minha conta" })[0]!,
    );
    await userEvent.type(screen.getByLabelText("Senha"), "errada");
    await userEvent.type(
      screen.getByLabelText(/Digite EXCLUIR para confirmar/u),
      "EXCLUIR",
    );
    await userEvent.click(
      screen.getByRole("checkbox", { name: /Entendo que meu perfil/u }),
    );
    await userEvent.click(
      screen.getAllByRole("button", { name: "Excluir minha conta" }).at(-1)!,
    );

    expect(
      await screen.findByText("Confirme sua senha para excluir a conta."),
    ).toBeInTheDocument();
    expect(screen.getByText("Senha incorreta.")).toBeInTheDocument();
    expect(action).toHaveBeenCalledTimes(1);
  });
});

describe("RecoverAccountPanel", () => {
  const base = {
    accountId: "c0000000-0000-4000-8000-000000000002",
    action: vi.fn().mockResolvedValue({ status: "idle" }),
    deletionDueAt: "2027-02-10T12:00:00.000Z",
    deletionState: "REQUESTED" as const,
    eliminationEligibleAt: "2026-11-14T12:00:00.000Z",
  };

  it("offers recovery with a required reason while the window is open", () => {
    render(<RecoverAccountPanel {...base} recoverable />);

    expect(screen.getByLabelText("Motivo da recuperação")).toBeRequired();
    expect(
      screen.getByRole("button", { name: "Recuperar conta" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/autorização de contato continua/iu),
    ).toBeInTheDocument();
  });

  it("hides the form once the window has closed", () => {
    render(<RecoverAccountPanel {...base} recoverable={false} />);

    expect(
      screen.queryByRole("button", { name: "Recuperar conta" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/janela de recuperação terminou/u),
    ).toBeInTheDocument();
  });
});

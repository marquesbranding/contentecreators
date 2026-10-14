import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { AccountDeletedPage } from "./account-deleted-page";
import { AccountDeletionSection } from "./account-deletion-section.client";

const RECOVERY_WORDING = /30 dias|120 dias|recupera(r|ção) (a|da|sua) conta/iu;

describe("AccountDeletionSection", () => {
  it("explains that the deletion is immediate and permanent before asking for confirmation", async () => {
    const { container } = render(
      <AccountDeletionSection
        action={vi.fn().mockResolvedValue({ status: "idle" })}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Excluir conta" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/A exclusão é imediata e não pode ser desfeita/u),
    ).toBeInTheDocument();
    expect(screen.getByText(/é só se cadastrar de novo/u)).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Excluir minha conta" }),
    );

    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Digite EXCLUIR para confirmar/u),
    ).toBeRequired();
    expect(
      screen.getByRole("checkbox", { name: /não há como recuperá-los/u }),
    ).toBeRequired();
    const warning = screen.getByRole("alert");
    expect(warning).toHaveTextContent(
      /os dados da sua conta serão excluídos de fato/u,
    );
    expect(warning).toHaveTextContent(/novo cadastro do zero/u);
    expect(
      screen.getAllByText(/se quiser voltar, é só se cadastrar de novo/iu)
        .length,
    ).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(RECOVERY_WORDING);
    expect(document.body.textContent).not.toMatch(RECOVERY_WORDING);
  });

  it("closes the confirmation dialog from the Cancelar button without submitting", async () => {
    const action = vi.fn().mockResolvedValue({ status: "idle" });
    render(<AccountDeletionSection action={action} />);

    await userEvent.click(
      screen.getAllByRole("button", { name: "Excluir minha conta" })[0]!,
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() =>
      expect(screen.queryByLabelText("Senha")).not.toBeInTheDocument(),
    );
    expect(action).not.toHaveBeenCalled();
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

describe("AccountDeletedPage", () => {
  it("confirms the permanent deletion and invites a new registration", () => {
    const { container } = render(<AccountDeletedPage />);

    expect(
      screen.getByRole("heading", { name: "Sua conta foi excluída" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Entrar e cadastrar de novo" }),
    ).toHaveAttribute("href", "/login");
    expect(container.textContent).not.toMatch(RECOVERY_WORDING);
  });
});

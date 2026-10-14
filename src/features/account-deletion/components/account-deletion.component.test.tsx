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
      screen.getByText(/Exclui seu perfil, fotos e dados agora/u),
    ).toBeInTheDocument();
    expect(screen.getByText(/Não dá para desfazer/u)).toBeInTheDocument();
    expect(screen.getByText(/faça um novo cadastro/u)).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Excluir minha conta" }),
    );

    expect(screen.queryByLabelText("Senha")).not.toBeInTheDocument();
    expect(
      screen.getByText("Digite EXCLUIR para confirmar."),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Digite EXCLUIR para confirmar/u),
    ).toBeRequired();
    expect(
      screen.getByRole("checkbox", {
        name: "Entendo que os dados serão apagados e não podem ser recuperados.",
      }),
    ).toBeRequired();
    const warning = screen.getByRole("alert");
    expect(warning).toHaveTextContent(
      "Atenção: seus dados serão excluídos de fato, agora.",
    );
    expect(warning).toHaveTextContent(
      "Para usar o sistema de novo, será preciso se cadastrar do zero.",
    );
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
      expect(
        screen.queryByLabelText(/Digite EXCLUIR para confirmar/u),
      ).not.toBeInTheDocument(),
    );
    expect(action).not.toHaveBeenCalled();
  });

  it("submits with only the EXCLUIR phrase and the acknowledgement, and shows the server errors", async () => {
    const action = vi.fn().mockResolvedValue({
      code: "VALIDATION_ERROR",
      fieldErrors: { confirmation: ["Digite EXCLUIR para confirmar."] },
      message: "Revise os campos destacados.",
      status: "error",
    });
    render(<AccountDeletionSection action={action} />);

    await userEvent.click(
      screen.getAllByRole("button", { name: "Excluir minha conta" })[0]!,
    );
    await userEvent.type(
      screen.getByLabelText(/Digite EXCLUIR para confirmar/u),
      "EXCLUIR",
    );
    await userEvent.click(
      screen.getByRole("checkbox", { name: /Entendo que os dados/u }),
    );
    await userEvent.click(
      screen.getAllByRole("button", { name: "Excluir minha conta" }).at(-1)!,
    );

    expect(
      await screen.findByText("Revise os campos destacados."),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Digite EXCLUIR para confirmar/u),
    ).toHaveAttribute("aria-invalid", "true");
    expect(action).toHaveBeenCalledTimes(1);

    const formData = action.mock.calls[0]![1] as FormData;
    expect(formData.get("confirmation")).toBe("EXCLUIR");
    expect(formData.get("acknowledged")).toBe("on");
    expect(formData.has("password")).toBe(false);
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

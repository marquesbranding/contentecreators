import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
const acceptMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("../server/actions/legal-acceptance.actions", () => ({
  acceptLegalDocumentsAction: (input: unknown) => acceptMock(input),
}));

import type { PendingLegalDocumentDto } from "../types/legal-acceptance.types";
import { LegalAcceptanceModal } from "./legal-acceptance-modal.client";

const terms: PendingLegalDocumentDto = {
  documentType: "TERMS",
  downloadName: "Contente Creators - Termos de Uso.pdf",
  id: "f5000000-0000-4000-8000-000000000001",
  pdfUrl: "/legal/termos-de-uso-v1.0.pdf",
  publishedLabel: "01/10/2026",
  title: "Termos de Uso",
  versionLabel: "1.0",
};
const privacy: PendingLegalDocumentDto = {
  documentType: "PRIVACY",
  downloadName: "Contente Creators - Política de Privacidade.pdf",
  id: "f5000000-0000-4000-8000-000000000002",
  pdfUrl: "/legal/politica-de-privacidade-v1.0.pdf",
  publishedLabel: "01/10/2026",
  title: "Política de Privacidade",
  versionLabel: "1.0",
};

function renderModal(documents = [terms, privacy]) {
  const signOut = vi.fn().mockResolvedValue(undefined);
  render(<LegalAcceptanceModal initialPending={documents} signOut={signOut} />);
  return { signOut };
}

describe("LegalAcceptanceModal", () => {
  beforeEach(() => {
    refresh.mockReset();
    acceptMock.mockReset();
  });

  it("lists each pending document with open and download links", () => {
    renderModal();

    expect(
      screen.getByRole("dialog", {
        name: "Aceite os documentos para continuar",
      }),
    ).toBeInTheDocument();
    const openLink = screen.getByRole("link", {
      name: "Abrir Termos de Uso em nova aba",
    });
    expect(openLink).toHaveAttribute("href", "/legal/termos-de-uso-v1.0.pdf");
    expect(openLink).toHaveAttribute("target", "_blank");
    expect(openLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(
      screen.getByRole("link", { name: "Baixar PDF de Termos de Uso" }),
    ).toHaveAttribute("download", "Contente Creators - Termos de Uso.pdf");
    expect(
      screen.getAllByText(/Versão 1\.0 · publicado em 01\/10\/2026/u),
    ).toHaveLength(2);
  });

  it("keeps the accept button disabled until the checkbox is checked", async () => {
    renderModal();

    const accept = screen.getByRole("button", { name: "Aceitar e continuar" });
    expect(accept).toBeDisabled();

    await userEvent.click(
      screen.getByRole("checkbox", {
        name: "Li e aceito os documentos acima",
      }),
    );

    expect(accept).toBeEnabled();
  });

  it("cannot be dismissed with Escape", async () => {
    renderModal();

    await userEvent.keyboard("{Escape}");

    expect(
      screen.getByRole("dialog", {
        name: "Aceite os documentos para continuar",
      }),
    ).toBeInTheDocument();
  });

  it("accepts every pending document, refreshes and closes", async () => {
    acceptMock.mockResolvedValue({ kind: "accepted" });
    renderModal();

    await userEvent.click(
      screen.getByRole("checkbox", { name: "Li e aceito os documentos acima" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Aceitar e continuar" }),
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", {
          name: "Aceite os documentos para continuar",
        }),
      ).not.toBeInTheDocument(),
    );
    expect(acceptMock).toHaveBeenCalledWith({
      documentIds: [terms.id, privacy.id],
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("sends the accept request only once for a double click", async () => {
    let resolveAccept: (value: { kind: "accepted" }) => void = () => {};
    acceptMock.mockReturnValue(
      new Promise((resolve) => {
        resolveAccept = resolve;
      }),
    );
    renderModal();

    await userEvent.click(
      screen.getByRole("checkbox", { name: "Li e aceito os documentos acima" }),
    );
    const accept = screen.getByRole("button", { name: "Aceitar e continuar" });
    await userEvent.dblClick(accept);
    resolveAccept({ kind: "accepted" });

    await waitFor(() => expect(acceptMock).toHaveBeenCalledTimes(1));
  });

  it("explains a stale version, refreshes and keeps the modal open", async () => {
    acceptMock.mockResolvedValue({ kind: "stale" });
    renderModal();

    await userEvent.click(
      screen.getByRole("checkbox", { name: "Li e aceito os documentos acima" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Aceitar e continuar" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Os documentos foram atualizados. Recarregamos a página.",
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("keeps the checkbox state and shows an error when saving fails", async () => {
    acceptMock.mockResolvedValue({ kind: "error" });
    renderModal();

    const checkbox = screen.getByRole("checkbox", {
      name: "Li e aceito os documentos acima",
    });
    await userEvent.click(checkbox);
    await userEvent.click(
      screen.getByRole("button", { name: "Aceitar e continuar" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível salvar seu aceite. Tente novamente.",
    );
    expect(checkbox).toBeChecked();
    expect(
      screen.getByRole("button", { name: "Aceitar e continuar" }),
    ).toBeEnabled();
  });

  it("renders nothing when no document is pending", () => {
    renderModal([]);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

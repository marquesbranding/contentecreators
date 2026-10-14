import { beforeEach, describe, expect, it, vi } from "vitest";

const listPending = vi.fn();

vi.mock("../repositories/drizzle-legal-acceptance.repository", () => ({
  createServerLegalAcceptanceRepository: async () => ({ listPending }),
}));

import { VerifiedAccountTransactionError } from "@/features/identity/server";

import { loadPendingLegalDocuments } from "./pending-legal-documents.queries";

describe("loadPendingLegalDocuments", () => {
  beforeEach(() => {
    listPending.mockReset();
  });

  it("joins pending rows with the PDF registry and formats the date in pt-BR", async () => {
    listPending.mockResolvedValue([
      {
        documentType: "TERMS",
        id: "f5000000-0000-4000-8000-000000000001",
        publishedAt: "2026-10-01T00:00:00.000Z",
        versionLabel: "1.0",
      },
    ]);

    await expect(loadPendingLegalDocuments()).resolves.toEqual([
      {
        documentType: "TERMS",
        downloadName: "Contente Creators - Termos de Uso.pdf",
        id: "f5000000-0000-4000-8000-000000000001",
        pdfUrl: "/legal/termos-de-uso-v1.0.pdf",
        publishedLabel: "01/10/2026",
        title: "Termos de Uso",
        versionLabel: "1.0",
      },
    ]);
  });

  it("keeps a document without a registered PDF, with no links", async () => {
    listPending.mockResolvedValue([
      {
        documentType: "PRIVACY",
        id: "f5000000-0000-4000-8000-000000000009",
        publishedAt: "2026-11-01T00:00:00.000Z",
        versionLabel: "2.0",
      },
    ]);

    const [document] = await loadPendingLegalDocuments();

    expect(document).toMatchObject({
      downloadName: null,
      pdfUrl: null,
      title: "Política de Privacidade",
    });
  });

  it.each(["UNAUTHENTICATED", "ACCOUNT_NOT_READY"] as const)(
    "returns an empty list on %s",
    async (code) => {
      listPending.mockRejectedValue(new VerifiedAccountTransactionError(code));

      await expect(loadPendingLegalDocuments()).resolves.toEqual([]);
    },
  );

  it("rethrows unexpected failures", async () => {
    listPending.mockRejectedValue(new Error("database down"));

    await expect(loadPendingLegalDocuments()).rejects.toThrow("database down");
  });
});

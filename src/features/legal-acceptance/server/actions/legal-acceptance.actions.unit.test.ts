import { beforeEach, describe, expect, it, vi } from "vitest";

const accept = vi.fn();

vi.mock("../repositories/drizzle-legal-acceptance.repository", () => ({
  createServerLegalAcceptanceRepository: async () => ({ accept }),
}));

import { acceptLegalDocumentsAction } from "./legal-acceptance.actions";

const documentIds = [
  "f5000000-0000-4000-8000-000000000001",
  "f5000000-0000-4000-8000-000000000002",
];

describe("acceptLegalDocumentsAction", () => {
  beforeEach(() => {
    accept.mockReset();
  });

  it("returns accepted when the repository records the consent", async () => {
    accept.mockResolvedValue({ kind: "accepted" });

    await expect(acceptLegalDocumentsAction({ documentIds })).resolves.toEqual({
      kind: "accepted",
    });
    expect(accept).toHaveBeenCalledWith(
      expect.objectContaining({ documentIds }),
    );
  });

  it("returns stale when a newer version became active", async () => {
    accept.mockResolvedValue({ kind: "stale" });

    await expect(acceptLegalDocumentsAction({ documentIds })).resolves.toEqual({
      kind: "stale",
    });
  });

  it("rejects malformed ids without touching the repository", async () => {
    await expect(
      acceptLegalDocumentsAction({ documentIds: ["not-a-uuid"] }),
    ).resolves.toEqual({ kind: "error" });
    await expect(
      acceptLegalDocumentsAction({ documentIds: [] }),
    ).resolves.toEqual({ kind: "error" });
    expect(accept).not.toHaveBeenCalled();
  });

  it("maps unexpected failures to error", async () => {
    accept.mockRejectedValue(new Error("connection reset"));

    await expect(acceptLegalDocumentsAction({ documentIds })).resolves.toEqual({
      kind: "error",
    });
  });
});

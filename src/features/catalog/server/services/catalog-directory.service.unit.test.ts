import { describe, expect, it, vi } from "vitest";

import type {
  VerifiedAccountContext,
  VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import { encodeDirectoryCursor } from "../repositories/catalog-directory-cursor";
import { createCatalogDirectoryService } from "./catalog-directory.service";

function createRunner(context: VerifiedAccountContext) {
  return vi.fn(
    async (
      _options: unknown,
      callback: Parameters<VerifiedAccountTransactionRunner>[1],
    ) => callback({} as never, context),
  ) as unknown as VerifiedAccountTransactionRunner;
}

const approvedInfluencer: VerifiedAccountContext = {
  accountId: "00000000-0000-4000-8000-000000000001",
  authUserId: "00000000-0000-4000-8000-000000000002",
  role: "INFLUENCER",
  status: "APPROVED",
};

describe("catalog directory service", () => {
  it("authorizes, validates and decodes a bounded list request", async () => {
    const list = vi.fn().mockResolvedValue({
      facets: { cities: [], niches: [], segments: [], states: [] },
      items: [],
      nextCursor: null,
      pageSize: 10,
    });
    const service = createCatalogDirectoryService({
      list,
      runVerifiedAccountTransaction: createRunner(approvedInfluencer),
    });
    const cursor = encodeDirectoryCursor({
      id: "00000000-0000-4000-8000-000000000003",
      kind: "COMPANY",
      seed: "2026-10-13",
      sortKey: "0123456789abcdef0123456789abcdef",
      v: 2,
    });

    await service.list(
      {
        cursor,
        followersMin: "1000",
        pageSize: "10",
        type: ["COMPANY", "UGC"],
      },
      "request-id",
    );

    expect(list).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        cursor: {
          id: "00000000-0000-4000-8000-000000000003",
          kind: "COMPANY",
          seed: "2026-10-13",
          sortKey: "0123456789abcdef0123456789abcdef",
          v: 2,
        },
        followersMin: 1_000,
        pageSize: 10,
        // The cursor pins its own day, whatever the clock says now.
        seed: "2026-10-13",
        type: ["COMPANY", "UGC"],
      }),
      {
        accountId: approvedInfluencer.accountId,
        role: "INFLUENCER",
      },
    );
  });

  it("uses today's Sao Paulo day when there is no cursor", async () => {
    const list = vi.fn().mockResolvedValue({});
    const service = createCatalogDirectoryService({
      list,
      now: () => new Date("2026-10-14T02:30:00.000Z"),
      runVerifiedAccountTransaction: createRunner(approvedInfluencer),
    });

    await service.list({}, "request-id");

    expect(list).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ cursor: null, seed: "2026-10-13" }),
      expect.anything(),
    );
  });

  it("serves the first page of the current order for a legacy v1 cursor", async () => {
    const list = vi.fn().mockResolvedValue({});
    const service = createCatalogDirectoryService({
      list,
      now: () => new Date("2026-10-14T12:00:00.000Z"),
      runVerifiedAccountTransaction: createRunner(approvedInfluencer),
    });
    const legacyCursor = btoa(
      JSON.stringify({
        createdAt: "2026-08-01T12:00:00.000Z",
        id: "00000000-0000-4000-8000-000000000003",
        kind: "COMPANY",
      }),
    )
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/u, "");

    await service.list({ cursor: legacyCursor }, "request-id");

    expect(list).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ cursor: null, seed: "2026-10-14" }),
      expect.anything(),
    );
  });

  it("rejects a structurally invalid opaque cursor before querying", async () => {
    const list = vi.fn();
    const service = createCatalogDirectoryService({
      list,
      runVerifiedAccountTransaction: createRunner(approvedInfluencer),
    });

    await expect(
      service.list({ cursor: "bm90LWpzb24" }, "request-id"),
    ).rejects.toMatchObject({ code: "INVALID_CURSOR" });
    expect(list).not.toHaveBeenCalled();
  });

  it("denies an approved admin before querying the directory", async () => {
    const list = vi.fn();
    const service = createCatalogDirectoryService({
      list,
      runVerifiedAccountTransaction: createRunner({
        ...approvedInfluencer,
        role: "ADMIN",
      }),
    });

    await expect(service.list({}, "request-id")).rejects.toMatchObject({
      code: "ROLE_FORBIDDEN",
    });
    expect(list).not.toHaveBeenCalled();
  });

  it("denies a non-approved company before querying the directory", async () => {
    const list = vi.fn();
    const service = createCatalogDirectoryService({
      list,
      runVerifiedAccountTransaction: createRunner({
        ...approvedInfluencer,
        role: "COMPANY",
        status: "PENDING_REVIEW",
      }),
    });

    await expect(service.list({}, "request-id")).rejects.toMatchObject({
      code: "STATUS_FORBIDDEN",
    });
    expect(list).not.toHaveBeenCalled();
  });
});

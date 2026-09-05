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
      createdAt: "2026-08-01T12:00:00.000Z",
      id: "00000000-0000-4000-8000-000000000003",
      kind: "COMPANY",
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
          createdAt: "2026-08-01T12:00:00.000Z",
          id: "00000000-0000-4000-8000-000000000003",
          kind: "COMPANY",
        },
        followersMin: 1_000,
        pageSize: 10,
        type: ["COMPANY", "UGC"],
      }),
      {
        accountId: approvedInfluencer.accountId,
        role: "INFLUENCER",
      },
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

import { describe, expect, it, vi } from "vitest";

import type {
  VerifiedAccountContext,
  VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import { encodeCreatorCatalogCursor } from "../repositories/creator-catalog-cursor";
import { createCreatorCatalogService } from "./creator-catalog.service";

function createRunner(context: VerifiedAccountContext) {
  return vi.fn(
    async (
      _options: unknown,
      callback: Parameters<VerifiedAccountTransactionRunner>[1],
    ) => callback({} as never, context),
  ) as unknown as VerifiedAccountTransactionRunner;
}

const approvedCompany: VerifiedAccountContext = {
  accountId: "00000000-0000-4000-8000-000000000001",
  authUserId: "00000000-0000-4000-8000-000000000002",
  role: "COMPANY",
  status: "APPROVED",
};

describe("creator catalog service", () => {
  it("authorizes, validates and decodes a bounded list request", async () => {
    const list = vi.fn().mockResolvedValue({
      items: [],
      nextCursor: null,
      pageSize: 10,
    });
    const service = createCreatorCatalogService({
      list,
      runVerifiedAccountTransaction: createRunner(approvedCompany),
    });
    const cursor = encodeCreatorCatalogCursor({
      creatorProfileId: "00000000-0000-4000-8000-000000000003",
      displayName: "Creator anterior",
    });

    await service.list(
      {
        cursor,
        niche: "beleza",
        pageSize: "10",
        platform: "INSTAGRAM",
      },
      "request-id",
    );

    expect(list).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        cursor: {
          creatorProfileId: "00000000-0000-4000-8000-000000000003",
          displayName: "Creator anterior",
        },
        niche: "beleza",
        pageSize: 10,
        platform: "INSTAGRAM",
      }),
      {
        accountId: approvedCompany.accountId,
        role: "COMPANY",
      },
    );
  });

  it("rejects a structurally invalid opaque cursor before querying", async () => {
    const list = vi.fn();
    const service = createCreatorCatalogService({
      list,
      runVerifiedAccountTransaction: createRunner(approvedCompany),
    });

    await expect(
      service.list({ cursor: "bm90LWpzb24" }, "request-id"),
    ).rejects.toMatchObject({ code: "INVALID_CURSOR" });
    expect(list).not.toHaveBeenCalled();
  });

  it("denies an approved admin before querying the catalog", async () => {
    const list = vi.fn();
    const service = createCreatorCatalogService({
      list,
      runVerifiedAccountTransaction: createRunner({
        ...approvedCompany,
        role: "ADMIN",
      }),
    });

    await expect(service.list({}, "request-id")).rejects.toMatchObject({
      code: "ROLE_FORBIDDEN",
    });
    expect(list).not.toHaveBeenCalled();
  });
});

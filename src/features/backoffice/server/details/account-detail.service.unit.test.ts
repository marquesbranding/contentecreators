import { describe, expect, it, vi } from "vitest";

import { createAccountDetailService } from "./account-detail.service";

describe("account detail service", () => {
  it("validates and delegates a safe account detail query", async () => {
    const findByAccountId = vi.fn().mockResolvedValue(null);
    const service = createAccountDetailService({
      repository: { findByAccountId },
    });

    await expect(
      service.load({
        accountId: "c0000000-0000-4000-8000-000000000002",
        requestId: "account-detail-request",
      }),
    ).resolves.toBeNull();
    expect(findByAccountId).toHaveBeenCalledWith({
      accountId: "c0000000-0000-4000-8000-000000000002",
      requestId: "account-detail-request",
    });
  });

  it("rejects malformed identifiers before repository access", async () => {
    const findByAccountId = vi.fn();
    const service = createAccountDetailService({
      repository: { findByAccountId },
    });

    await expect(
      service.load({ accountId: "unsafe", requestId: "request-ok" }),
    ).rejects.toThrow();
    expect(findByAccountId).not.toHaveBeenCalled();
  });
});

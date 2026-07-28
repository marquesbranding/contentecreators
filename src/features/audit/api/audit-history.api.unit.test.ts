import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";

import { auditHistoryKeys, fetchAuditHistory } from "./audit-history.api";

const response = {
  items: [
    {
      action: "UPDATE",
      actor: {
        accountId: "a0000000-0000-4000-8000-000000000001",
        actorType: "ADMIN",
        role: "ADMIN",
      },
      changes: [
        { after: "APPROVED", before: "PENDING_REVIEW", field: "status" },
      ],
      entity: "accounts",
      occurredAt: "2026-07-28T12:00:00.000Z",
      reason: "Aprovação manual",
      record: "b0000000-0000-4000-8000-000000000001",
      requestId: "audit-request",
      revision: 42,
      source: "BACKOFFICE",
    },
  ],
  pagination: {
    page: 1,
    pageSize: 20,
    totalItems: 1,
    totalPages: 1,
  },
} as const;

describe("audit history browser API", () => {
  it("uses a stable normalized query key", () => {
    expect(auditHistoryKeys.list({ entity: "  accounts ", page: 1 })).toEqual(
      auditHistoryKeys.list({
        entity: "accounts",
        page: 1,
        pageSize: 20,
      }),
    );
  });

  it("forwards cancellation and canonical URL-owned filters to Axios", async () => {
    const signal = new AbortController().signal;
    const get = vi.fn().mockResolvedValue({ data: response });
    const client = { get } as unknown as AxiosInstance;

    await expect(
      fetchAuditHistory(
        {
          action: "UPDATE",
          entity: "accounts",
          page: 1,
          pageSize: 20,
          source: "BACKOFFICE",
        },
        signal,
        client,
      ),
    ).resolves.toEqual(response);

    expect(get).toHaveBeenCalledWith(
      "/backoffice/audit?entity=accounts&action=UPDATE&source=BACKOFFICE&page=1&pageSize=20",
      { signal },
    );
  });

  it("rejects raw or unknown response fields at the browser boundary", async () => {
    const client = {
      get: vi.fn().mockResolvedValue({
        data: {
          ...response,
          rawRows: [{ operationalEmail: "private@example.test" }],
        },
      }),
    } as unknown as AxiosInstance;

    await expect(
      fetchAuditHistory({ page: 1 }, new AbortController().signal, client),
    ).rejects.toThrow();
  });
});

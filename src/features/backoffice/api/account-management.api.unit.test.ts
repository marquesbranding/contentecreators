import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";

import {
  accountManagementKeys,
  fetchManagedAccounts,
} from "./account-management.api";

const response = {
  items: [
    {
      accountId: "c0000000-0000-4000-8000-000000000002",
      archivedAt: null,
      completionPercentage: 80,
      createdAt: "2026-07-25T12:00:00.000Z",
      displayName: "Empresa Dois",
      operationalEmail: "company-pending@contentecreators.test",
      role: "COMPANY",
      status: "PENDING_REVIEW",
      updatedAt: "2026-07-25T12:00:00.000Z",
      version: 1,
    },
  ],
  pagination: {
    page: 1,
    pageSize: 20,
    totalItems: 1,
    totalPages: 1,
  },
} as const;

describe("account management browser API", () => {
  it("uses a stable normalized query key", () => {
    expect(accountManagementKeys.list({ search: "  Empresa " })).toEqual(
      accountManagementKeys.list({
        archive: "ACTIVE",
        order: "NEWEST",
        page: 1,
        pageSize: 20,
        role: undefined,
        search: "Empresa",
        status: undefined,
      }),
    );
  });

  it("forwards cancellation and canonical filters to Axios", async () => {
    const signal = new AbortController().signal;
    const get = vi.fn().mockResolvedValue({ data: response });
    const client = { get } as unknown as AxiosInstance;

    await expect(
      fetchManagedAccounts(
        {
          archive: "ACTIVE",
          order: "NEWEST",
          page: 1,
          pageSize: 20,
          role: "COMPANY",
          search: "Empresa",
        },
        signal,
        client,
      ),
    ).resolves.toEqual(response);

    expect(get).toHaveBeenCalledWith(
      "/backoffice/accounts?role=COMPANY&archive=ACTIVE&search=Empresa&order=NEWEST&page=1&pageSize=20",
      { signal },
    );
  });
});

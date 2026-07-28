import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";

import {
  fetchModerationQueue,
  moderationQueueKeys,
} from "./moderation-queue.api";

const response = {
  counts: {
    byRole: { COMPANY: 1, INFLUENCER: 1 },
    byStatus: {
      APPROVED: 0,
      BANNED: 0,
      CHANGES_REQUESTED: 0,
      PENDING_REVIEW: 1,
      SUSPENDED: 0,
    },
  },
  items: [
    {
      accountId: "b0000000-0000-4000-8000-000000000002",
      accountVersion: 1,
      completionPercentage: 80,
      completionVersion: 1,
      displayName: "Bruno Conteúdo",
      profileVersion: 1,
      role: "INFLUENCER",
      status: "PENDING_REVIEW",
      submittedAt: "2026-07-25T12:00:00.000Z",
    },
  ],
  pagination: {
    page: 1,
    pageSize: 20,
    totalItems: 1,
    totalPages: 1,
  },
} as const;

describe("moderation queue browser API", () => {
  it("uses a stable normalized query key", () => {
    expect(
      moderationQueueKeys.list({
        role: "INFLUENCER",
        search: "  Bruno ",
      }),
    ).toEqual(
      moderationQueueKeys.list({
        order: "PENDING_FIRST",
        page: 1,
        pageSize: 20,
        role: "INFLUENCER",
        search: "Bruno",
        status: undefined,
      }),
    );
  });

  it("forwards AbortSignal and canonical URL filters to Axios", async () => {
    const signal = new AbortController().signal;
    const get = vi.fn().mockResolvedValue({ data: response });
    const client = { get } as unknown as AxiosInstance;

    await expect(
      fetchModerationQueue(
        {
          order: "PENDING_FIRST",
          page: 1,
          pageSize: 20,
          role: "INFLUENCER",
          search: "Bruno",
        },
        signal,
        client,
      ),
    ).resolves.toEqual(response);

    expect(get).toHaveBeenCalledWith(
      "/backoffice/moderation?role=INFLUENCER&search=Bruno&order=PENDING_FIRST&page=1&pageSize=20",
      { signal },
    );
  });
});

import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";

import {
  adminEmailOutboxKeys,
  fetchAdminEmailOutboxDetail,
  fetchAdminEmailOutboxList,
} from "./admin-email-outbox.api";

const safeItem = {
  attemptCount: 5,
  createdAt: "2026-07-28T12:00:00.000Z",
  dueAt: "2026-07-28T13:00:00.000Z",
  id: "90000000-0000-4000-8000-000000000001",
  maxAttempts: 5,
  recipientReference: "Conta 00000001",
  reference: "E-mail #90000000",
  retry: { eligible: true, reason: "ELIGIBLE" },
  status: "DEAD_LETTER",
  template: "APPROVED",
  updatedAt: "2026-07-28T12:05:00.000Z",
} as const;

describe("admin email outbox browser API", () => {
  it("uses stable canonical list keys independent of object insertion order", () => {
    expect(
      adminEmailOutboxKeys.list({
        status: "FAILED",
        page: 2,
        order: "NEWEST",
      }),
    ).toEqual(
      adminEmailOutboxKeys.list({
        order: "NEWEST",
        page: 2,
        status: "FAILED",
      }),
    );
  });

  it("passes AbortSignal to Axios and validates minimized list responses", async () => {
    const signal = new AbortController().signal;
    const get = vi.fn(async () => ({
      data: {
        counts: { DEAD_LETTER: 1, FAILED: 0, PENDING: 0 },
        items: [safeItem],
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1,
        },
      },
    }));

    await expect(
      fetchAdminEmailOutboxList({ status: "DEAD_LETTER" }, signal, {
        get,
      } as unknown as AxiosInstance),
    ).resolves.toEqual(expect.objectContaining({ items: [safeItem] }));
    expect(get).toHaveBeenCalledWith(
      "/backoffice/emails?status=DEAD_LETTER&order=ATTENTION_FIRST&page=1&pageSize=20",
      { signal },
    );
  });

  it("loads safe attempt detail without accepting raw provider fields", async () => {
    const signal = new AbortController().signal;
    const get = vi.fn(async () => ({
      data: {
        attempts: [
          {
            attemptNumber: 5,
            attemptedAt: "2026-07-28T12:05:00.000Z",
            latencyMs: 100,
            outcome: "TIMEOUT_FAILURE",
            status: "FAILED",
          },
        ],
        item: safeItem,
      },
    }));

    await fetchAdminEmailOutboxDetail(safeItem.id, signal, {
      get,
    } as unknown as AxiosInstance);

    expect(get).toHaveBeenCalledWith(`/backoffice/emails/${safeItem.id}`, {
      signal,
    });
  });
});

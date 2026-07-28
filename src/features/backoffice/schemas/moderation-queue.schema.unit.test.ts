import { describe, expect, it } from "vitest";

import {
  moderationQueueFiltersSchema,
  moderationQueueResponseSchema,
  parseModerationQueueSearchParams,
  serializeModerationQueueFilters,
} from "./moderation-queue.schema";

describe("moderation queue schemas", () => {
  it("applies bounded defaults and normalizes user-owned URL filters", () => {
    expect(
      parseModerationQueueSearchParams(
        new URLSearchParams({
          order: "NAME_ASC",
          page: "2",
          pageSize: "999",
          role: "COMPANY",
          search: "  Empresa Dois  ",
          status: "PENDING_REVIEW",
        }),
      ),
    ).toEqual({
      order: "NAME_ASC",
      page: 2,
      pageSize: 50,
      role: "COMPANY",
      search: "Empresa Dois",
      status: "PENDING_REVIEW",
    });
  });

  it("uses deterministic defaults and rejects unsupported queue values", () => {
    expect(moderationQueueFiltersSchema.parse({})).toEqual({
      order: "PENDING_FIRST",
      page: 1,
      pageSize: 20,
      role: "INFLUENCER",
      search: "",
      status: undefined,
    });
    expect(() =>
      moderationQueueFiltersSchema.parse({
        role: "ADMIN",
        status: "ONBOARDING",
      }),
    ).toThrow();
  });

  it("serializes only canonical filters in a stable order", () => {
    expect(
      serializeModerationQueueFilters({
        order: "NEWEST_SUBMITTED",
        page: 3,
        pageSize: 10,
        role: "COMPANY",
        search: "Moda",
        status: "CHANGES_REQUESTED",
      }).toString(),
    ).toBe(
      "role=COMPANY&status=CHANGES_REQUESTED&search=Moda&order=NEWEST_SUBMITTED&page=3&pageSize=10",
    );
  });

  it("rejects a response that exposes unexpected account data", () => {
    expect(() =>
      moderationQueueResponseSchema.parse({
        counts: {
          byRole: { COMPANY: 1, INFLUENCER: 0 },
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
            accountId: "c0000000-0000-4000-8000-000000000002",
            accountVersion: 1,
            authUserId: "must-not-cross-the-boundary",
            completionPercentage: 80,
            completionVersion: 1,
            displayName: "Empresa Dois",
            profileVersion: 1,
            role: "COMPANY",
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
      }),
    ).toThrow();
  });
});

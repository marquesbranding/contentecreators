import { describe, expect, it } from "vitest";

import {
  isSafeRequestId,
  resolveRequestId,
  requestIdResponseHeaders,
} from "./request-id";

describe("safe operational request IDs", () => {
  it.each([
    "request-admin-action",
    "sponsor.list:2026",
    "f6000000-0000-4000-8000-000000000002",
  ])("accepts a bounded correlation identifier: %s", (requestId) => {
    expect(isSafeRequestId(requestId)).toBe(true);
  });

  it.each([
    "creator@example.test",
    "11222333000181",
    "Bearer-secret-token",
    "eyJhbGciOiJIUzI1NiJ9.payload.signature",
    "https://storage.test/object?token=secret",
    "x".repeat(129),
  ])("rejects a request identifier carrying unsafe data: %s", (requestId) => {
    expect(isSafeRequestId(requestId)).toBe(false);
  });

  it("uses the trusted fallback and produces no-store correlation headers", () => {
    const headers = new Headers({
      "x-request-id": "creator@example.test",
    });

    expect(resolveRequestId(headers, () => "safe-fallback")).toBe(
      "safe-fallback",
    );
    expect(requestIdResponseHeaders("safe-fallback")).toEqual({
      "cache-control": "no-store",
      "x-request-id": "safe-fallback",
    });
  });
});

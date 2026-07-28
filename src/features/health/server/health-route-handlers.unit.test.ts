import { describe, expect, it, vi } from "vitest";

import { findSensitiveDataLeaks } from "@/shared/server/observability/operational-logger";

import { createHealthRouteHandlers } from "./health-route-handlers";

function createDependencies(
  checkReadiness: () => Promise<void> = vi.fn(async () => undefined),
) {
  return {
    checkReadiness,
    log: vi.fn(),
    now: () => new Date("2026-07-28T18:30:00.000Z"),
    requestIdFactory: () => "health-request-fallback",
    timeoutMs: 50,
  };
}

function request(requestId = "health-request-client") {
  return new Request("http://localhost/api/health/live", {
    headers: { "x-request-id": requestId },
  });
}

describe("health route handlers", () => {
  it("returns liveness without touching dependencies or configuration", async () => {
    const dependencies = createDependencies();
    const handlers = createHealthRouteHandlers(dependencies);
    const response = await handlers.live(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-request-id")).toBe("health-request-client");
    await expect(response.json()).resolves.toEqual({
      requestId: "health-request-client",
      status: "ok",
      timestamp: "2026-07-28T18:30:00.000Z",
    });
    expect(dependencies.checkReadiness).not.toHaveBeenCalled();
  });

  it("returns ready only after the bounded dependency probe succeeds", async () => {
    const dependencies = createDependencies();
    const handlers = createHealthRouteHandlers(dependencies);
    const response = await handlers.ready(request("ready-request"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      requestId: "ready-request",
      status: "ready",
      timestamp: "2026-07-28T18:30:00.000Z",
    });
    expect(dependencies.checkReadiness).toHaveBeenCalledOnce();
  });

  it("returns a data-minimized 503 and log when readiness fails", async () => {
    const dependencies = createDependencies(
      vi.fn(async () => {
        throw new Error(
          "postgres://admin:secret@db.example.test/app creator@example.test",
        );
      }),
    );
    const handlers = createHealthRouteHandlers(dependencies);
    const response = await handlers.ready(request("creator@example.test"));
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(response.headers.get("x-request-id")).toBe(
      "health-request-fallback",
    );
    expect(JSON.parse(body)).toEqual({
      requestId: "health-request-fallback",
      status: "unavailable",
      timestamp: "2026-07-28T18:30:00.000Z",
    });
    expect(body).not.toContain("postgres");
    expect(body).not.toContain("example.test");
    expect(findSensitiveDataLeaks(dependencies.log.mock.calls)).toEqual([]);
  });

  it("stops waiting after the configured readiness timeout", async () => {
    const dependencies = createDependencies(
      () => new Promise<void>(() => undefined),
    );
    const handlers = createHealthRouteHandlers(dependencies);
    const startedAt = performance.now();
    const response = await handlers.ready(request());
    const elapsedMs = performance.now() - startedAt;

    expect(response.status).toBe(503);
    expect(elapsedMs).toBeLessThan(500);
  });
});

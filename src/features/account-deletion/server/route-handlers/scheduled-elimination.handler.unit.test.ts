import { describe, expect, it, vi } from "vitest";

import {
  createScheduledEliminationHandler,
  errorCategoryOf,
} from "./scheduled-elimination.handler";

const secret = "s".repeat(40);
const summary = {
  candidates: 0,
  deadlineAlerts: 0,
  dryRun: true,
  eliminated: 0,
  failed: 0,
  fingerprint: "f",
  storageFailed: 0,
  storageQueued: 0,
  storageRemoved: 0,
};

function handler(
  appEnvironment: "development" | "local" | "production",
  run = vi.fn().mockResolvedValue(summary),
) {
  const logError = vi.fn();

  return {
    handle: createScheduledEliminationHandler({
      appEnvironment,
      createRequestId: () => "req-1",
      cronSecret: secret,
      logError,
      run,
    }),
    logError,
    run,
  };
}

function request(path = "/api/cron/account-elimination", token = secret) {
  return new Request(`https://example.test${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });
}

describe("scheduled account elimination handler", () => {
  it("rejects calls without the cron secret", async () => {
    const { handle, run } = handler("production");

    const response = await handle(request(undefined, "wrong"));

    expect(response.status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });

  it("only reports outside production unless execute=1", async () => {
    const { handle, run } = handler("development");

    await handle(request());
    await handle(request("/api/cron/account-elimination?execute=1"));

    expect(run).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ dryRun: true }),
    );
    expect(run).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ dryRun: false }),
    );
  });

  it("always executes in production", async () => {
    const { handle, run } = handler("production");

    await handle(request());

    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: false }),
    );
  });

  it("hides failures behind a generic 500", async () => {
    const { handle } = handler(
      "production",
      vi.fn().mockRejectedValue(new Error("secret detail")),
    );

    const response = await handle(request());

    expect(response.status).toBe(500);
    expect(await response.text()).toBe('{"success":false}');
  });

  it("logs a redacted error event before answering 500", async () => {
    const failure = Object.assign(
      new Error("insert failed for ana@example.com at /x/y.png"),
      { code: "23514" },
    );
    const { handle, logError } = handler(
      "production",
      vi.fn().mockRejectedValue(failure),
    );

    const response = await handle(request());

    expect(response.status).toBe(500);
    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith({
      errorCategory: "23514",
      requestId: "req-1",
    });
    expect(JSON.stringify(logError.mock.calls)).not.toMatch(
      /ana@example|\/x\/y|insert failed/,
    );
  });

  it("does not log on success or on an unauthorized call", async () => {
    const { handle, logError } = handler("production");

    await handle(request());
    await handle(request(undefined, "wrong"));

    expect(logError).not.toHaveBeenCalled();
  });

  it("reduces unknown or unsafe error shapes to UNEXPECTED", () => {
    expect(errorCategoryOf(new Error("plain"))).toBe("UNEXPECTED");
    expect(errorCategoryOf({ code: "x@y.com" })).toBe("UNEXPECTED");
    expect(errorCategoryOf({ code: "a".repeat(41) })).toBe("UNEXPECTED");
    expect(errorCategoryOf("boom")).toBe("UNEXPECTED");
    expect(errorCategoryOf({ code: "PGRST116" })).toBe("PGRST116");
  });
});

import { describe, expect, it, vi } from "vitest";

import { createScheduledEliminationHandler } from "./scheduled-elimination.handler";

const secret = "s".repeat(40);
const summary = {
  candidates: 0,
  deadlineAlerts: 0,
  dryRun: true,
  eliminated: 0,
  failed: 0,
  fingerprint: "f",
  identitiesRetried: 0,
};

function handler(
  appEnvironment: "development" | "local" | "production",
  run = vi.fn().mockResolvedValue(summary),
) {
  return {
    handle: createScheduledEliminationHandler({
      appEnvironment,
      createRequestId: () => "req-1",
      cronSecret: secret,
      run,
    }),
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
    expect(await response.text()).not.toContain("secret detail");
  });
});

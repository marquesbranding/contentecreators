import { describe, expect, it, vi } from "vitest";

import { createScheduledOutboxHandler } from "./scheduled-outbox.handler";

const cronSecret = "scheduled-email-secret-with-at-least-32-characters";

function request(authorization?: string) {
  return new Request("https://app.example.com/api/cron/email-outbox", {
    headers: authorization ? { authorization } : undefined,
  });
}

describe("scheduled outbox Route Handler", () => {
  it.each([undefined, "", "Bearer wrong-secret", cronSecret])(
    "rejects an invalid operational authorization header",
    async (authorization) => {
      const processDue = vi.fn();
      const handle = createScheduledOutboxHandler({
        cronSecret,
        processDue,
      });

      const response = await handle(request(authorization));

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ success: false });
      expect(processDue).not.toHaveBeenCalled();
    },
  );

  it("rejects a configured secret below the project security minimum", async () => {
    const processDue = vi.fn();
    const handle = createScheduledOutboxHandler({
      cronSecret: "short",
      processDue,
    });

    const response = await handle(request("Bearer short"));

    expect(response.status).toBe(401);
    expect(processDue).not.toHaveBeenCalled();
  });

  it("processes a bounded batch for the Vercel bearer credential", async () => {
    const processDue = vi.fn(async () => ({
      claimed: 3,
      failed: 1,
      sent: 2,
    }));
    const handle = createScheduledOutboxHandler({
      createRequestId: () => "cron-request-id",
      cronSecret,
      processDue,
    });

    const response = await handle(request(`Bearer ${cronSecret}`));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      claimed: 3,
      failed: 1,
      sent: 2,
      success: true,
    });
    expect(processDue).toHaveBeenCalledWith({
      batchSize: 25,
      requestId: "cron-request-id",
      source: "CRON",
    });
  });

  it("returns a data-minimized unavailable response when processing fails", async () => {
    const processDue = vi.fn(async () => {
      throw new Error("recipient@example.com SMTP password=unsafe");
    });
    const handle = createScheduledOutboxHandler({
      cronSecret,
      processDue,
    });

    const response = await handle(request(`Bearer ${cronSecret}`));
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(JSON.parse(body)).toEqual({ success: false });
    expect(body).not.toContain("recipient@example.com");
    expect(body).not.toContain("password");
  });
});

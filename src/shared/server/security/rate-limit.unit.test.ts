import { describe, expect, it, vi } from "vitest";

import {
  createRateLimitKey,
  createRateLimitService,
  RATE_LIMIT_POLICIES,
} from "./rate-limit";

describe("privacy-safe rate limiting", () => {
  it("hashes raw identifiers into a fixed non-reversible key", () => {
    const key = createRateLimitKey([
      "network:203.0.113.10",
      "email:person@example.test",
    ]);

    expect(key).toMatch(/^[a-f0-9]{64}$/u);
    expect(key).not.toContain("203.0.113.10");
    expect(key).not.toContain("person@example.test");
  });

  it("defines bounded policies for every required abuse surface", () => {
    expect(Object.keys(RATE_LIMIT_POLICIES).sort()).toEqual([
      "adminCommand",
      "cnpjLookup",
      "contactReveal",
      "passwordRecovery",
      "signUp",
    ]);

    for (const policy of Object.values(RATE_LIMIT_POLICIES)) {
      expect(policy.limit).toBeGreaterThan(0);
      expect(policy.windowSeconds).toBeGreaterThan(0);
      expect(policy.limit).toBeLessThanOrEqual(60);
      expect(policy.windowSeconds).toBeLessThanOrEqual(60 * 60);
    }
  });

  it("returns a retry boundary from the atomic repository result", async () => {
    const consume = vi.fn().mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 37,
    });
    const service = createRateLimitService({ consume });

    await expect(
      service.consume({
        key: createRateLimitKey(["account:synthetic-account"]),
        policy: "adminCommand",
      }),
    ).resolves.toEqual({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 37,
    });
    expect(consume).toHaveBeenCalledWith({
      keyHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      limit: RATE_LIMIT_POLICIES.adminCommand.limit,
      scope: "admin_command",
      windowSeconds: RATE_LIMIT_POLICIES.adminCommand.windowSeconds,
    });
  });
});

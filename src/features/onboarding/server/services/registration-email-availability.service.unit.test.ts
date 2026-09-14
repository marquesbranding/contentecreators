import { describe, expect, it, vi } from "vitest";

import { createRegistrationEmailAvailabilityService } from "./registration-email-availability.service";

function createService(options: { allowed?: boolean; registered?: boolean }) {
  const hasRegisteredProfile = vi
    .fn()
    .mockResolvedValue(options.registered ?? false);
  const consume = vi
    .fn()
    .mockResolvedValue({ allowed: options.allowed ?? true });

  return {
    consume,
    hasRegisteredProfile,
    service: createRegistrationEmailAvailabilityService({
      consume,
      hasRegisteredProfile,
    }),
  };
}

describe("registration e-mail availability service", () => {
  it("reports a registered e-mail using its normalized form", async () => {
    const { hasRegisteredProfile, service } = createService({
      registered: true,
    });

    await expect(
      service.check({
        email: "  Vevox@Example.com ",
        networkIdentity: "203.0.113.7",
      }),
    ).resolves.toEqual({ status: "registered" });
    expect(hasRegisteredProfile).toHaveBeenCalledWith("vevox@example.com");
  });

  it("reports an unused e-mail as available", async () => {
    const { service } = createService({ registered: false });

    await expect(
      service.check({ email: "nova@example.com", networkIdentity: "ip" }),
    ).resolves.toEqual({ status: "available" });
  });

  it("does not look anything up for a malformed e-mail", async () => {
    const { consume, hasRegisteredProfile, service } = createService({});

    await expect(
      service.check({ email: "nao-e-email", networkIdentity: "ip" }),
    ).resolves.toEqual({ status: "invalid" });
    expect(consume).not.toHaveBeenCalled();
    expect(hasRegisteredProfile).not.toHaveBeenCalled();
  });

  it("stops looking up once the network used its quota", async () => {
    const { hasRegisteredProfile, service } = createService({
      allowed: false,
    });

    await expect(
      service.check({ email: "nova@example.com", networkIdentity: "ip" }),
    ).resolves.toEqual({ status: "rate_limited" });
    expect(hasRegisteredProfile).not.toHaveBeenCalled();
  });
});

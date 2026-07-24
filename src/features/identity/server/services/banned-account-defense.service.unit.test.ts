import { describe, expect, it, vi } from "vitest";

import type { CurrentSessionDto } from "../../types/current-account.types";
import { createBannedAccountDefenseService } from "./banned-account-defense.service";

const approvedSession: CurrentSessionDto = {
  account: {
    id: "b0000000-0000-4000-8000-000000000004",
    role: "INFLUENCER",
    status: "APPROVED",
  },
  kind: "authenticated",
};
const bannedSession: CurrentSessionDto = {
  account: {
    id: "b0000000-0000-4000-8000-000000000006",
    role: "INFLUENCER",
    status: "BANNED",
  },
  kind: "authenticated",
};

function createDependencies(session: CurrentSessionDto) {
  return {
    banIdentity: vi.fn(async () => true),
    getCurrentAccessToken: vi.fn(async () => "access-token"),
    resolveCurrentIdentityId: vi.fn(
      async () => "20000000-0000-4000-8000-000000000006",
    ),
    resolveCurrentSession: vi.fn(async () => session),
    revokeAccessToken: vi.fn(async () => true),
    signOut: vi.fn(async () => undefined),
  };
}

describe("banned account defense", () => {
  it("leaves a non-banned session untouched", async () => {
    const dependencies = createDependencies(approvedSession);
    const service = createBannedAccountDefenseService(dependencies);

    await expect(service.enforce("post-auth-approved")).resolves.toEqual({
      kind: "allowed",
    });
    expect(dependencies.getCurrentAccessToken).not.toHaveBeenCalled();
    expect(dependencies.resolveCurrentIdentityId).not.toHaveBeenCalled();
    expect(dependencies.signOut).not.toHaveBeenCalled();
  });

  it("revokes, administratively bans, and clears a known banned session", async () => {
    const dependencies = createDependencies(bannedSession);
    const service = createBannedAccountDefenseService(dependencies);

    await expect(service.enforce("post-auth-banned")).resolves.toEqual({
      destination: "/app/status/blocked",
      kind: "blocked",
    });
    expect(dependencies.revokeAccessToken).toHaveBeenCalledWith("access-token");
    expect(dependencies.banIdentity).toHaveBeenCalledWith(
      "20000000-0000-4000-8000-000000000006",
    );
    expect(dependencies.signOut).toHaveBeenCalledOnce();
  });

  it("fails closed and still clears cookies if provider revocation is partially unavailable", async () => {
    const dependencies = createDependencies(bannedSession);
    dependencies.revokeAccessToken.mockResolvedValueOnce(false);
    dependencies.banIdentity.mockResolvedValueOnce(false);
    const service = createBannedAccountDefenseService(dependencies);

    await expect(
      service.enforce("post-auth-provider-failure"),
    ).resolves.toEqual({
      destination: "/app/status/blocked",
      kind: "blocked",
    });
    expect(dependencies.signOut).toHaveBeenCalledOnce();
  });
});

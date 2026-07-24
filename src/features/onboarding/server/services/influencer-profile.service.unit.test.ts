import { describe, expect, it, vi } from "vitest";

import type {
  VerifiedAccountContext,
  VerifiedAccountTransactionRunner,
} from "@/features/identity/server";
import type { InfluencerProfileEditInput } from "../../schemas/influencer-profile-edit-schema";
import { createInfluencerProfileService } from "./influencer-profile.service";

const approvedInfluencer: VerifiedAccountContext = {
  accountId: "b0000000-0000-4000-8000-000000000004",
  authUserId: "20000000-0000-4000-8000-000000000004",
  role: "INFLUENCER",
  status: "APPROVED",
};

const updateInput = {
  bio: "Crio conteúdo autoral de tecnologia e produtividade para a internet.",
  city: "São Paulo",
  creatorType: "UGC",
  displayName: "Joana Atualizada",
  engagementRate: 5.75,
  expectedVersion: 3,
  followers: 42000,
  legalName: "Joana da Silva",
  nicheSlugs: ["tecnologia"],
  socialPlatform: "YOUTUBE",
  socialUrl: "https://youtube.com/@joana-atualizada",
  state: "SP",
  whatsapp: "(11) 99999-9999",
} satisfies InfluencerProfileEditInput;

function runnerWith(
  account: VerifiedAccountContext,
): VerifiedAccountTransactionRunner {
  return async (_request, work) =>
    work(
      {} as Parameters<Parameters<VerifiedAccountTransactionRunner>[1]>[0],
      account,
    );
}

describe("influencer profile service", () => {
  it("loads and updates only the approved influencer owner", async () => {
    const profile = {
      ...updateInput,
      avatarAssetId: null,
      coverAssetId: null,
      version: 3,
    };
    const repository = {
      loadApprovedProfile: vi.fn().mockResolvedValue(profile),
      updateApprovedProfile: vi.fn().mockResolvedValue({
        kind: "updated",
        profile: { ...profile, version: 4 },
      }),
    };
    const service = createInfluencerProfileService({
      repository,
      runVerifiedTransaction: runnerWith(approvedInfluencer),
    });

    await expect(
      service.loadOwnerProfile({ requestId: "load-profile" }),
    ).resolves.toEqual(profile);
    await expect(
      service.updateOwnerProfile({
        input: updateInput,
        requestId: "update-profile",
      }),
    ).resolves.toMatchObject({
      kind: "updated",
      profile: { version: 4 },
    });
    expect(repository.loadApprovedProfile).toHaveBeenCalledWith(
      expect.anything(),
      approvedInfluencer.accountId,
    );
    expect(repository.updateApprovedProfile).toHaveBeenCalledWith(
      expect.anything(),
      approvedInfluencer.accountId,
      updateInput,
      "update-profile",
    );
  });

  it.each([
    [{ ...approvedInfluencer, role: "COMPANY" as const }, "ROLE_FORBIDDEN"],
    [
      { ...approvedInfluencer, status: "SUSPENDED" as const },
      "STATUS_FORBIDDEN",
    ],
  ])("rejects unauthorized account context %#", async (account, code) => {
    const service = createInfluencerProfileService({
      repository: {
        loadApprovedProfile: vi.fn(),
        updateApprovedProfile: vi.fn(),
      },
      runVerifiedTransaction: runnerWith(account),
    });

    await expect(
      service.loadOwnerProfile({ requestId: "denied-profile" }),
    ).rejects.toMatchObject({ code });
  });
});

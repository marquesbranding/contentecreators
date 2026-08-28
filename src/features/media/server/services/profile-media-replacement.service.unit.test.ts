import { describe, expect, it, vi } from "vitest";

import type { CurrentSessionDto } from "@/features/identity/server";

import { createProfileMediaReplacementService } from "./profile-media-replacement.service";

const creatorAccount = {
  id: "b0000000-0000-4000-8000-000000000004",
  role: "INFLUENCER",
  status: "APPROVED",
} as const;
const suspendedAccount = {
  ...creatorAccount,
  status: "SUSPENDED",
} as const;
const pendingAssetId = "76000000-0000-4000-8000-000000000002";
const currentAssetId = "76000000-0000-4000-8000-000000000001";

function authenticated(
  account: typeof creatorAccount | typeof suspendedAccount,
): CurrentSessionDto {
  return {
    account,
    kind: "authenticated",
  };
}

function dependencies(
  session: CurrentSessionDto = authenticated(creatorAccount),
) {
  return {
    repository: {
      activateProfileMedia: vi.fn().mockResolvedValue({
        assetId: pendingAssetId,
        kind: "activated",
        profileVersion: 8,
        replacedAssetId: currentAssetId,
      }),
      removeProfileMedia: vi.fn().mockResolvedValue({
        kind: "removed",
        profileVersion: 9,
      }),
    },
    resolveCurrentSession: vi.fn().mockResolvedValue(session),
  };
}

describe("profile media replacement service", () => {
  it("activates a validated pending asset and reports the archived predecessor", async () => {
    const serviceDependencies = dependencies();
    const service = createProfileMediaReplacementService(serviceDependencies);

    const result = await service.activateProfileMedia({
      assetId: pendingAssetId,
      expectedCurrentAssetId: currentAssetId,
      purpose: "AVATAR",
      requestId: "replace-profile-media-unit",
    });

    expect(
      serviceDependencies.repository.activateProfileMedia,
    ).toHaveBeenCalledWith({
      assetId: pendingAssetId,
      expectedCurrentAssetId: currentAssetId,
      purpose: "AVATAR",
      requestId: "replace-profile-media-unit",
    });
    expect(result).toEqual({
      asset: {
        id: pendingAssetId,
        status: "ACTIVE",
      },
      kind: "activated",
      profileVersion: 8,
      replacedAssetId: currentAssetId,
    });
  });

  it("denies sponsorship purpose and a restricted account before persistence", async () => {
    const creatorDependencies = dependencies();
    const creatorService =
      createProfileMediaReplacementService(creatorDependencies);

    await expect(
      creatorService.activateProfileMedia({
        assetId: pendingAssetId,
        expectedCurrentAssetId: null,
        purpose: "SPONSORSHIP_CREATIVE",
        requestId: "wrong-replacement-purpose-unit",
      }),
    ).resolves.toEqual({
      code: "ACCESS_DENIED",
      kind: "error",
    });
    expect(
      creatorDependencies.repository.activateProfileMedia,
    ).not.toHaveBeenCalled();

    const suspendedDependencies = dependencies(authenticated(suspendedAccount));
    const suspendedService = createProfileMediaReplacementService(
      suspendedDependencies,
    );

    await expect(
      suspendedService.activateProfileMedia({
        assetId: pendingAssetId,
        expectedCurrentAssetId: null,
        purpose: "AVATAR",
        requestId: "suspended-replacement-unit",
      }),
    ).resolves.toEqual({
      code: "ACCESS_DENIED",
      kind: "error",
    });
    expect(
      suspendedDependencies.repository.activateProfileMedia,
    ).not.toHaveBeenCalled();
  });

  it.each([
    {
      code: "MEDIA_REPLACEMENT_CONFLICT",
      repositoryResult: { kind: "conflict" },
    },
    {
      code: "MEDIA_ASSET_NOT_FOUND",
      repositoryResult: { kind: "not_found" },
    },
  ] as const)(
    "maps $repositoryResult.kind without exposing repository data",
    async ({ code, repositoryResult }) => {
      const serviceDependencies = dependencies();
      serviceDependencies.repository.activateProfileMedia.mockResolvedValue(
        repositoryResult,
      );
      const service = createProfileMediaReplacementService(serviceDependencies);

      await expect(
        service.activateProfileMedia({
          assetId: pendingAssetId,
          expectedCurrentAssetId: null,
          purpose: "AVATAR",
          requestId: "replacement-error-unit",
        }),
      ).resolves.toEqual({
        code,
        kind: "error",
      });
    },
  );

  it("removes the active asset for an authorized purpose", async () => {
    const serviceDependencies = dependencies();
    const service = createProfileMediaReplacementService(serviceDependencies);

    const result = await service.removeProfileMedia({
      purpose: "AVATAR",
      requestId: "remove-profile-media-unit",
    });

    expect(
      serviceDependencies.repository.removeProfileMedia,
    ).toHaveBeenCalledWith({
      purpose: "AVATAR",
      requestId: "remove-profile-media-unit",
    });
    expect(result).toEqual({ kind: "removed", profileVersion: 9 });
  });

  it("denies removal for a restricted account before persistence", async () => {
    const suspendedDependencies = dependencies(authenticated(suspendedAccount));
    const suspendedService = createProfileMediaReplacementService(
      suspendedDependencies,
    );

    await expect(
      suspendedService.removeProfileMedia({
        purpose: "AVATAR",
        requestId: "suspended-removal-unit",
      }),
    ).resolves.toEqual({
      code: "ACCESS_DENIED",
      kind: "error",
    });
    expect(
      suspendedDependencies.repository.removeProfileMedia,
    ).not.toHaveBeenCalled();
  });

  it("maps a not_found repository result without exposing repository data", async () => {
    const serviceDependencies = dependencies();
    serviceDependencies.repository.removeProfileMedia.mockResolvedValue({
      kind: "not_found",
    });
    const service = createProfileMediaReplacementService(serviceDependencies);

    await expect(
      service.removeProfileMedia({
        purpose: "AVATAR",
        requestId: "remove-not-found-unit",
      }),
    ).resolves.toEqual({
      code: "ACCESS_DENIED",
      kind: "error",
    });
  });
});

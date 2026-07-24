import { describe, expect, it, vi } from "vitest";

import type { CurrentSessionDto } from "@/features/identity/server";

import { createMediaUploadService } from "./media-upload.service";

const accounts = {
  admin: {
    id: "a0000000-0000-4000-8000-000000000001",
    role: "ADMIN",
    status: "APPROVED",
  },
  company: {
    id: "c0000000-0000-4000-8000-000000000004",
    role: "COMPANY",
    status: "APPROVED",
  },
  creator: {
    id: "b0000000-0000-4000-8000-000000000001",
    role: "INFLUENCER",
    status: "ONBOARDING",
  },
  suspendedCreator: {
    id: "b0000000-0000-4000-8000-000000000005",
    role: "INFLUENCER",
    status: "SUSPENDED",
  },
} as const;
const objectId = "73000000-0000-4000-8000-000000000001";
const pngHeader = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function authenticated(
  account: (typeof accounts)[keyof typeof accounts],
): CurrentSessionDto {
  return {
    account,
    kind: "authenticated",
  };
}

function dependencies(
  session: CurrentSessionDto = authenticated(accounts.creator),
) {
  return {
    createObjectId: vi.fn(() => objectId),
    repository: {
      createPendingMedia: vi.fn().mockResolvedValue({
        id: "74000000-0000-4000-8000-000000000001",
      }),
    },
    resolveCurrentSession: vi.fn().mockResolvedValue(session),
    storage: {
      createSignedUpload: vi.fn().mockResolvedValue({
        token: "signed-upload-token",
      }),
      inspectObject: vi.fn().mockResolvedValue({
        contentType: "image/png",
        headerBytes: pngHeader,
        sizeBytes: 2048,
      }),
    },
  };
}

describe("media upload service", () => {
  it("prepares a non-overwriting owner-scoped upload after validation", async () => {
    const serviceDependencies = dependencies();
    const service = createMediaUploadService(serviceDependencies);

    const result = await service.prepareUpload({
      declaredMimeType: "image/png",
      fileName: "minha-foto.png",
      purpose: "AVATAR",
      requestId: "prepare-media-unit",
      sizeBytes: 2048,
    });

    const expectedObjectPath = `${accounts.creator.id}/avatar/${objectId}.png`;
    expect(result).toEqual({
      kind: "prepared",
      upload: {
        bucketName: "profile-media",
        objectPath: expectedObjectPath,
        token: "signed-upload-token",
      },
    });
    expect(serviceDependencies.storage.createSignedUpload).toHaveBeenCalledWith(
      {
        bucketName: "profile-media",
        objectPath: expectedObjectPath,
        upsert: false,
      },
    );
  });

  it("rejects invalid purpose, status and file declarations before issuing a token", async () => {
    const companyDependencies = dependencies(authenticated(accounts.company));
    const companyService = createMediaUploadService(companyDependencies);

    await expect(
      companyService.prepareUpload({
        declaredMimeType: "image/png",
        fileName: "avatar.png",
        purpose: "AVATAR",
        requestId: "wrong-purpose-unit",
        sizeBytes: 2048,
      }),
    ).resolves.toEqual({
      code: "ACCESS_DENIED",
      kind: "error",
    });
    expect(
      companyDependencies.storage.createSignedUpload,
    ).not.toHaveBeenCalled();

    const suspendedDependencies = dependencies(
      authenticated(accounts.suspendedCreator),
    );
    const suspendedService = createMediaUploadService(suspendedDependencies);

    await expect(
      suspendedService.prepareUpload({
        declaredMimeType: "image/png",
        fileName: "avatar.png",
        purpose: "AVATAR",
        requestId: "suspended-media-unit",
        sizeBytes: 2048,
      }),
    ).resolves.toEqual({
      code: "ACCESS_DENIED",
      kind: "error",
    });
    expect(
      suspendedDependencies.storage.createSignedUpload,
    ).not.toHaveBeenCalled();

    await expect(
      companyService.prepareUpload({
        declaredMimeType: "image/svg+xml",
        fileName: "logo.svg",
        purpose: "LOGO",
        requestId: "invalid-image-unit",
        sizeBytes: 2048,
      }),
    ).resolves.toEqual({
      code: "UNSUPPORTED_DECLARED_MIME",
      kind: "error",
    });
  });

  it("permits only an approved admin to prepare sponsorship creative", async () => {
    const serviceDependencies = dependencies(authenticated(accounts.admin));
    const service = createMediaUploadService(serviceDependencies);

    await expect(
      service.prepareUpload({
        declaredMimeType: "image/png",
        fileName: "banner.png",
        purpose: "SPONSORSHIP_CREATIVE",
        requestId: "admin-media-unit",
        sizeBytes: 2048,
      }),
    ).resolves.toMatchObject({
      kind: "prepared",
      upload: {
        bucketName: "sponsorship-media",
        objectPath: `${accounts.admin.id}/creative/${objectId}.png`,
      },
    });
  });

  it("re-authorizes, inspects real bytes and only then creates pending metadata", async () => {
    const serviceDependencies = dependencies();
    const service = createMediaUploadService(serviceDependencies);
    const objectPath = `${accounts.creator.id}/avatar/${objectId}.png`;

    const result = await service.finalizeUpload({
      bucketName: "profile-media",
      objectPath,
      purpose: "AVATAR",
      requestId: "finalize-media-unit",
    });

    expect(serviceDependencies.storage.inspectObject).toHaveBeenCalledWith({
      bucketName: "profile-media",
      objectPath,
    });
    expect(
      serviceDependencies.repository.createPendingMedia,
    ).toHaveBeenCalledWith({
      bucketName: "profile-media",
      kind: "AVATAR",
      mimeType: "image/png",
      objectPath,
      requestId: "finalize-media-unit",
      sizeBytes: 2048,
    });
    expect(result).toEqual({
      asset: {
        id: "74000000-0000-4000-8000-000000000001",
        status: "PENDING",
      },
      kind: "finalized",
    });
  });

  it("rejects a foreign path before inspecting Storage", async () => {
    const serviceDependencies = dependencies();
    const service = createMediaUploadService(serviceDependencies);

    await expect(
      service.finalizeUpload({
        bucketName: "profile-media",
        objectPath: `${accounts.company.id}/avatar/${objectId}.png`,
        purpose: "AVATAR",
        requestId: "foreign-media-unit",
      }),
    ).resolves.toEqual({
      code: "OBJECT_PATH_INVALID",
      kind: "error",
    });
    expect(serviceDependencies.storage.inspectObject).not.toHaveBeenCalled();
    expect(
      serviceDependencies.repository.createPendingMedia,
    ).not.toHaveBeenCalled();
  });

  it("does not persist missing or byte-signature-invalid objects", async () => {
    const missingDependencies = dependencies();
    missingDependencies.storage.inspectObject.mockResolvedValue(null);
    const missingService = createMediaUploadService(missingDependencies);
    const objectPath = `${accounts.creator.id}/avatar/${objectId}.png`;

    await expect(
      missingService.finalizeUpload({
        bucketName: "profile-media",
        objectPath,
        purpose: "AVATAR",
        requestId: "missing-media-unit",
      }),
    ).resolves.toEqual({
      code: "OBJECT_NOT_FOUND",
      kind: "error",
    });
    expect(
      missingDependencies.repository.createPendingMedia,
    ).not.toHaveBeenCalled();

    const invalidDependencies = dependencies();
    invalidDependencies.storage.inspectObject.mockResolvedValue({
      contentType: "image/png",
      headerBytes: new Uint8Array([0x3c, 0x73, 0x76, 0x67]),
      sizeBytes: 2048,
    });
    const invalidService = createMediaUploadService(invalidDependencies);

    await expect(
      invalidService.finalizeUpload({
        bucketName: "profile-media",
        objectPath,
        purpose: "AVATAR",
        requestId: "invalid-bytes-media-unit",
      }),
    ).resolves.toEqual({
      code: "UNSUPPORTED_IMAGE_SIGNATURE",
      kind: "error",
    });
    expect(
      invalidDependencies.repository.createPendingMedia,
    ).not.toHaveBeenCalled();
  });
});

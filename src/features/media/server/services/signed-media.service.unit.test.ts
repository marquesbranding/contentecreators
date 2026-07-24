import { describe, expect, it, vi } from "vitest";

import { createSignedMediaService } from "./signed-media.service";

const assetId = "78000000-0000-4000-8000-000000000001";
const internalAsset = {
  bucketName: "profile-media" as const,
  height: 1080,
  id: assetId,
  mimeType: "image/webp" as const,
  objectPath:
    "b0000000-0000-4000-8000-000000000004/avatar/78000000-0000-4000-8000-000000000001.webp",
  width: 1080,
};
const now = new Date("2026-07-24T15:00:00.000Z");

function dependencies() {
  return {
    now: vi.fn(() => now),
    repository: {
      findAuthorizedActiveMedia: vi.fn().mockResolvedValue(internalAsset),
    },
    storage: {
      createSignedDownload: vi.fn().mockResolvedValue({
        signedUrl:
          "http://127.0.0.1:54321/storage/v1/object/sign/profile-media/private?token=short-lived",
      }),
    },
  };
}

describe("signed media service", () => {
  it("returns a short-lived minimal DTO without bucket or object path", async () => {
    const serviceDependencies = dependencies();
    const service = createSignedMediaService(serviceDependencies);

    const dto = await service.getSignedMedia(assetId);

    expect(
      serviceDependencies.storage.createSignedDownload,
    ).toHaveBeenCalledWith({
      bucketName: internalAsset.bucketName,
      expiresInSeconds: 300,
      objectPath: internalAsset.objectPath,
    });
    expect(dto).toEqual({
      expiresAt: "2026-07-24T15:05:00.000Z",
      height: 1080,
      id: assetId,
      mimeType: "image/webp",
      url: "http://127.0.0.1:54321/storage/v1/object/sign/profile-media/private?token=short-lived",
      width: 1080,
    });
    expect(dto).not.toHaveProperty("bucketName");
    expect(dto).not.toHaveProperty("objectPath");
    expect(dto).not.toHaveProperty("signedUrl");
  });

  it("does not contact Storage when RLS/DAL cannot resolve an eligible asset", async () => {
    const serviceDependencies = dependencies();
    serviceDependencies.repository.findAuthorizedActiveMedia.mockResolvedValue(
      null,
    );
    const service = createSignedMediaService(serviceDependencies);

    await expect(service.getSignedMedia(assetId)).resolves.toBeNull();
    expect(
      serviceDependencies.storage.createSignedDownload,
    ).not.toHaveBeenCalled();
  });

  it("fails closed when signed URL generation is unavailable", async () => {
    const serviceDependencies = dependencies();
    serviceDependencies.storage.createSignedDownload.mockResolvedValue(null);
    const service = createSignedMediaService(serviceDependencies);

    await expect(service.getSignedMedia(assetId)).resolves.toBeNull();
  });

  it("rejects an invalid asset id before the DAL", async () => {
    const serviceDependencies = dependencies();
    const service = createSignedMediaService(serviceDependencies);

    await expect(
      service.getSignedMedia("../private-object"),
    ).resolves.toBeNull();
    expect(
      serviceDependencies.repository.findAuthorizedActiveMedia,
    ).not.toHaveBeenCalled();
  });
});

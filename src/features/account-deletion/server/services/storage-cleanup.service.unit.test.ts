import { describe, expect, it, vi } from "vitest";

import { createStorageCleanup } from "./storage-cleanup.service";

function setup(removeResult: (bucket: string) => boolean | Error) {
  const identity = {
    removeStorageObjects: vi.fn(async (bucket: string) => {
      const result = removeResult(bucket);

      if (result instanceof Error) {
        throw result;
      }

      return result;
    }),
  };
  const repository = {
    completeStorageCleanup: vi.fn().mockResolvedValue(undefined),
    listStorageCleanup: vi
      .fn()
      .mockResolvedValue([
        { attemptCount: 1, bucket: "profile-media", path: "acc/a.png" },
      ]),
    recordStorageCleanupFailure: vi.fn().mockResolvedValue(undefined),
  };

  return {
    cleanup: createStorageCleanup({ identity, repository }),
    identity,
    repository,
  };
}

describe("storage cleanup", () => {
  it("removes per bucket and dequeues only what was removed", async () => {
    const context = setup((bucket) => bucket === "profile-media");

    const result = await context.cleanup.remove([
      { bucket: "profile-media", path: "acc/a.png" },
      { bucket: "profile-media", path: "acc/b.png" },
      { bucket: "sponsorship-media", path: "acc/c.png" },
    ]);

    expect(result).toEqual({ failed: 1, removed: 2 });
    expect(context.identity.removeStorageObjects).toHaveBeenCalledWith(
      "profile-media",
      ["acc/a.png", "acc/b.png"],
    );
    expect(context.repository.completeStorageCleanup).toHaveBeenCalledWith([
      { bucket: "profile-media", path: "acc/a.png" },
      { bucket: "profile-media", path: "acc/b.png" },
    ]);
    expect(context.repository.recordStorageCleanupFailure).toHaveBeenCalledWith(
      [{ bucket: "sponsorship-media", path: "acc/c.png" }],
      "STORAGE",
    );
  });

  it("treats a thrown Storage error as a failure kept in the queue", async () => {
    const context = setup(() => new Error("network"));

    const result = await context.cleanup.drainQueue(50);

    expect(context.repository.listStorageCleanup).toHaveBeenCalledWith(50);
    expect(result).toEqual({ failed: 1, removed: 0 });
    expect(context.repository.completeStorageCleanup).not.toHaveBeenCalled();
  });

  it("does nothing for an account without media", async () => {
    const context = setup(() => true);

    expect(await context.cleanup.remove([])).toEqual({ failed: 0, removed: 0 });
    expect(context.identity.removeStorageObjects).not.toHaveBeenCalled();
  });
});

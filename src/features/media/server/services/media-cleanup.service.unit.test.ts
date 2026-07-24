import { describe, expect, it, vi } from "vitest";

import {
  createMediaCleanupService,
  type MediaCleanupCandidate,
  type MediaCleanupPolicy,
} from "./media-cleanup.service";

const approvedPolicy: MediaCleanupPolicy = {
  approvalReference: "POLITICA-LGPD-2026-01",
  archivedRetentionDays: 90,
  orphanRetentionDays: 14,
};

const candidates: MediaCleanupCandidate[] = [
  {
    bucketName: "profile-media",
    category: "ORPHAN",
    objectPath: "owner/avatar/orphan.png",
    observedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  {
    assetId: "0195f870-6f68-7c54-a7f1-e3e72cce18ac",
    bucketName: "sponsorship-media",
    category: "ARCHIVED",
    objectPath: "admin/sponsorship-creative/archived.webp",
    observedAt: new Date("2025-12-01T00:00:00.000Z"),
  },
];

function createDependencies() {
  return {
    findCandidates: vi.fn(async () => candidates),
    now: () => new Date("2026-07-24T12:00:00.000Z"),
    removeObjects: vi.fn(async () => undefined),
  };
}

type MediaCleanupRunResult = Awaited<
  ReturnType<ReturnType<typeof createMediaCleanupService>["run"]>
>;

function requireReport(result: MediaCleanupRunResult) {
  if (result.kind !== "reported") {
    throw new Error("Expected a dry-run report.");
  }

  return result.report;
}

describe("media cleanup service", () => {
  it("produces a deterministic dry-run report without deleting objects", async () => {
    const dependencies = createDependencies();
    const service = createMediaCleanupService(dependencies);

    const first = await service.run({
      mode: "DRY_RUN",
      policy: approvedPolicy,
      requestId: "media-cleanup-dry-run",
    });
    const second = await service.run({
      mode: "DRY_RUN",
      policy: approvedPolicy,
      requestId: "another-request-id",
    });

    const firstReport = requireReport(first);
    const secondReport = requireReport(second);

    expect(first.kind).toBe("reported");
    expect(firstReport.candidateCount).toBe(2);
    expect(firstReport.candidates).toEqual([
      expect.objectContaining({ category: "ARCHIVED" }),
      expect.objectContaining({ category: "ORPHAN" }),
    ]);
    expect(firstReport.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(firstReport.fingerprint).toBe(secondReport.fingerprint);
    expect(dependencies.findCandidates).toHaveBeenCalledWith({
      archivedBefore: new Date("2026-04-25T12:00:00.000Z"),
      limit: 1_001,
      orphanBefore: new Date("2026-07-10T12:00:00.000Z"),
    });
    expect(dependencies.removeObjects).not.toHaveBeenCalled();
  });

  it.each([
    {
      input: {
        ...approvedPolicy,
        approvalReference: "",
      },
      problem: "POLICY_APPROVAL_REQUIRED",
    },
    {
      input: {
        ...approvedPolicy,
        orphanRetentionDays: 0,
      },
      problem: "RETENTION_INVALID",
    },
    {
      input: {
        ...approvedPolicy,
        archivedRetentionDays: -1,
      },
      problem: "RETENTION_INVALID",
    },
  ] as const)(
    "rejects an unapproved or invalid retention policy",
    async ({ input, problem }) => {
      const dependencies = createDependencies();
      const service = createMediaCleanupService(dependencies);

      const result = await service.run({
        mode: "DRY_RUN",
        policy: input,
        requestId: "media-cleanup-invalid-policy",
      });

      expect(result).toEqual({
        code: problem,
        kind: "rejected",
      });
      expect(dependencies.findCandidates).not.toHaveBeenCalled();
    },
  );

  it("requires confirmation from an exact prior dry-run before execution", async () => {
    const dependencies = createDependencies();
    const service = createMediaCleanupService(dependencies);

    const missing = await service.run({
      mode: "EXECUTE",
      policy: approvedPolicy,
      requestId: "media-cleanup-execute",
    });
    const stale = await service.run({
      confirmation: {
        candidateCount: 2,
        evaluatedAt: "2026-07-24T12:00:00.000Z",
        fingerprint: "a".repeat(64),
      },
      mode: "EXECUTE",
      policy: approvedPolicy,
      requestId: "media-cleanup-execute",
    });

    expect(missing).toEqual({
      code: "DRY_RUN_CONFIRMATION_REQUIRED",
      kind: "rejected",
    });
    expect(stale).toEqual({
      code: "REPORT_CHANGED",
      kind: "rejected",
    });
    expect(dependencies.removeObjects).not.toHaveBeenCalled();
  });

  it("deletes the unchanged, confirmed report grouped by private bucket", async () => {
    const dependencies = createDependencies();
    const service = createMediaCleanupService(dependencies);
    const dryRun = await service.run({
      mode: "DRY_RUN",
      policy: approvedPolicy,
      requestId: "media-cleanup-dry-run",
    });
    const report = requireReport(dryRun);

    const result = await service.run({
      confirmation: {
        candidateCount: report.candidateCount,
        evaluatedAt: report.evaluatedAt,
        fingerprint: report.fingerprint,
      },
      mode: "EXECUTE",
      policy: approvedPolicy,
      requestId: "media-cleanup-execute",
    });

    expect(result).toEqual({
      deletedCount: 2,
      fingerprint: report.fingerprint,
      kind: "executed",
    });
    expect(dependencies.removeObjects).toHaveBeenCalledTimes(2);
    expect(dependencies.removeObjects).toHaveBeenNthCalledWith(1, {
      bucketName: "profile-media",
      objectPaths: ["owner/avatar/orphan.png"],
    });
    expect(dependencies.removeObjects).toHaveBeenNthCalledWith(2, {
      bucketName: "sponsorship-media",
      objectPaths: ["admin/sponsorship-creative/archived.webp"],
    });
  });

  it("does not report successful execution when Storage rejects a batch", async () => {
    const dependencies = createDependencies();
    dependencies.removeObjects.mockRejectedValueOnce(
      new Error("storage unavailable"),
    );
    const service = createMediaCleanupService(dependencies);
    const dryRun = await service.run({
      mode: "DRY_RUN",
      policy: approvedPolicy,
      requestId: "media-cleanup-dry-run",
    });
    const report = requireReport(dryRun);

    await expect(
      service.run({
        confirmation: {
          candidateCount: report.candidateCount,
          evaluatedAt: report.evaluatedAt,
          fingerprint: report.fingerprint,
        },
        mode: "EXECUTE",
        policy: approvedPolicy,
        requestId: "media-cleanup-execute",
      }),
    ).rejects.toThrow("storage unavailable");
  });
});

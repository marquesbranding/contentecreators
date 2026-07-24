import "server-only";

import { createHash } from "node:crypto";

import type { MediaBucketName } from "../../types/media-upload.types";

const MAX_REPORT_CANDIDATES = 1_000;
const REPORT_CONFIRMATION_MAX_AGE_MS = 15 * 60 * 1_000;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;

export type MediaCleanupCategory = "ARCHIVED" | "ORPHAN";

export interface MediaCleanupCandidate {
  assetId?: string;
  bucketName: MediaBucketName;
  category: MediaCleanupCategory;
  objectPath: string;
  observedAt: Date;
}

export interface MediaCleanupPolicy {
  approvalReference: string;
  archivedRetentionDays: number;
  orphanRetentionDays: number;
}

export interface MediaCleanupReportCandidate extends Omit<
  MediaCleanupCandidate,
  "observedAt"
> {
  observedAt: string;
}

export interface MediaCleanupReport {
  candidateCount: number;
  candidates: MediaCleanupReportCandidate[];
  evaluatedAt: string;
  fingerprint: string;
  hasMore: boolean;
  policy: MediaCleanupPolicy;
}

type MediaCleanupRejectionCode =
  | "DRY_RUN_CONFIRMATION_REQUIRED"
  | "POLICY_APPROVAL_REQUIRED"
  | "REPORT_CHANGED"
  | "REPORT_EXPIRED"
  | "RETENTION_INVALID";

type MediaCleanupResult =
  | {
      kind: "reported";
      report: MediaCleanupReport;
    }
  | {
      deletedCount: number;
      fingerprint: string;
      kind: "executed";
    }
  | {
      code: MediaCleanupRejectionCode;
      kind: "rejected";
    };

interface MediaCleanupConfirmation {
  candidateCount: number;
  evaluatedAt: string;
  fingerprint: string;
}

type MediaCleanupInput = {
  confirmation?: MediaCleanupConfirmation;
  mode: "DRY_RUN" | "EXECUTE";
  policy: MediaCleanupPolicy;
  requestId: string;
};

interface MediaCleanupDependencies {
  findCandidates(input: {
    archivedBefore: Date;
    limit: number;
    orphanBefore: Date;
  }): Promise<MediaCleanupCandidate[]>;
  now(): Date;
  removeObjects(input: {
    bucketName: MediaBucketName;
    objectPaths: string[];
  }): Promise<void>;
}

function rejection(code: MediaCleanupRejectionCode): MediaCleanupResult {
  return {
    code,
    kind: "rejected",
  };
}

function isPositiveInteger(value: number) {
  return Number.isInteger(value) && value > 0;
}

function validatePolicy(policy: MediaCleanupPolicy) {
  if (!policy.approvalReference.trim()) {
    return "POLICY_APPROVAL_REQUIRED" as const;
  }

  if (
    !isPositiveInteger(policy.archivedRetentionDays) ||
    !isPositiveInteger(policy.orphanRetentionDays)
  ) {
    return "RETENTION_INVALID" as const;
  }

  return null;
}

function subtractDays(date: Date, days: number) {
  return new Date(date.getTime() - days * MILLISECONDS_PER_DAY);
}

function normalizeCandidates(candidates: MediaCleanupCandidate[]) {
  return candidates
    .toSorted((left, right) =>
      [left.category, left.bucketName, left.objectPath, left.assetId ?? ""]
        .join(":")
        .localeCompare(
          [
            right.category,
            right.bucketName,
            right.objectPath,
            right.assetId ?? "",
          ].join(":"),
        ),
    )
    .slice(0, MAX_REPORT_CANDIDATES)
    .map((candidate): MediaCleanupReportCandidate => ({
      ...candidate,
      observedAt: candidate.observedAt.toISOString(),
    }));
}

function createFingerprint(input: {
  candidates: MediaCleanupReportCandidate[];
  evaluatedAt: string;
  policy: MediaCleanupPolicy;
}) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        candidates: input.candidates,
        evaluatedAt: input.evaluatedAt,
        policy: {
          approvalReference: input.policy.approvalReference.trim(),
          archivedRetentionDays: input.policy.archivedRetentionDays,
          orphanRetentionDays: input.policy.orphanRetentionDays,
        },
      }),
    )
    .digest("hex");
}

function isValidConfirmationDate(evaluatedAt: string, now: Date) {
  const timestamp = Date.parse(evaluatedAt);

  return (
    Number.isFinite(timestamp) &&
    timestamp <= now.getTime() &&
    now.getTime() - timestamp <= REPORT_CONFIRMATION_MAX_AGE_MS
  );
}

export function createMediaCleanupService(
  dependencies: MediaCleanupDependencies,
) {
  async function buildReport(
    policy: MediaCleanupPolicy,
    evaluatedAt: Date,
  ): Promise<MediaCleanupReport> {
    const rawCandidates = await dependencies.findCandidates({
      archivedBefore: subtractDays(evaluatedAt, policy.archivedRetentionDays),
      limit: MAX_REPORT_CANDIDATES + 1,
      orphanBefore: subtractDays(evaluatedAt, policy.orphanRetentionDays),
    });
    const candidates = normalizeCandidates(rawCandidates);
    const normalizedPolicy = {
      ...policy,
      approvalReference: policy.approvalReference.trim(),
    };
    const evaluatedAtIso = evaluatedAt.toISOString();

    return {
      candidateCount: candidates.length,
      candidates,
      evaluatedAt: evaluatedAtIso,
      fingerprint: createFingerprint({
        candidates,
        evaluatedAt: evaluatedAtIso,
        policy: normalizedPolicy,
      }),
      hasMore: rawCandidates.length > MAX_REPORT_CANDIDATES,
      policy: normalizedPolicy,
    };
  }

  return {
    async run(input: MediaCleanupInput): Promise<MediaCleanupResult> {
      const policyProblem = validatePolicy(input.policy);

      if (policyProblem) {
        return rejection(policyProblem);
      }

      const now = dependencies.now();

      if (input.mode === "DRY_RUN") {
        return {
          kind: "reported",
          report: await buildReport(input.policy, now),
        };
      }

      if (!input.confirmation) {
        return rejection("DRY_RUN_CONFIRMATION_REQUIRED");
      }

      if (!isValidConfirmationDate(input.confirmation.evaluatedAt, now)) {
        return rejection("REPORT_EXPIRED");
      }

      const report = await buildReport(
        input.policy,
        new Date(input.confirmation.evaluatedAt),
      );

      if (
        input.confirmation.candidateCount !== report.candidateCount ||
        input.confirmation.fingerprint !== report.fingerprint
      ) {
        return rejection("REPORT_CHANGED");
      }

      for (const bucketName of [
        "profile-media",
        "sponsorship-media",
      ] as const) {
        const objectPaths = report.candidates
          .filter((candidate) => candidate.bucketName === bucketName)
          .map((candidate) => candidate.objectPath);

        if (objectPaths.length > 0) {
          await dependencies.removeObjects({
            bucketName,
            objectPaths,
          });
        }
      }

      return {
        deletedCount: report.candidateCount,
        fingerprint: report.fingerprint,
        kind: "executed",
      };
    },
  };
}

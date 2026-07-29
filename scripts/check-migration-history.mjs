import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const migrationPathPattern =
  /^supabase\/migrations\/\d{14}_[a-z0-9]+(?:_[a-z0-9]+)*\.sql$/u;

export function parseMigrationChanges(output) {
  return output
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => {
      const [status = "", sourcePath = "", targetPath] = line.split("\t");

      return {
        sourcePath,
        status,
        targetPath,
      };
    });
}

function formatChange(change) {
  const target = change.targetPath ? ` -> ${change.targetPath}` : "";

  return `${change.status} ${change.sourcePath}${target}`;
}

export function validateMigrationChanges(changes) {
  const violations = [];

  for (const change of changes) {
    if (change.status !== "A") {
      violations.push(formatChange(change));
      continue;
    }

    if (!migrationPathPattern.test(change.sourcePath)) {
      violations.push(
        `${formatChange(change)} (expected YYYYMMDDHHMMSS_lower_snake_case.sql)`,
      );
    }
  }

  return violations;
}

export function assertUsableBaseRevision(baseRevision) {
  if (!baseRevision) {
    throw new Error(
      "A base revision is required to protect applied migration history.",
    );
  }

  if (/^0+$/u.test(baseRevision)) {
    throw new Error(
      "The push has no trusted previous revision; migration history check fails closed.",
    );
  }
}

export function buildComparisonRange(
  baseRevision,
  headRevision,
  comparisonMode,
) {
  if (comparisonMode === "direct") {
    return `${baseRevision}..${headRevision}`;
  }

  if (comparisonMode === "merge-base") {
    return `${baseRevision}...${headRevision}`;
  }

  throw new Error(`Unsupported migration comparison mode: ${comparisonMode}`);
}

function readChangesFromGit(baseRevision, headRevision, comparisonMode) {
  const gitCommand = process.env.GIT_BINARY || "git";
  const result = spawnSync(
    gitCommand,
    [
      "diff",
      "--name-status",
      "--find-renames",
      buildComparisonRange(baseRevision, headRevision, comparisonMode),
      "--",
      "supabase/migrations",
    ],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  if (result.error || result.status !== 0) {
    const diagnostic =
      result.stderr.trim() ||
      result.error?.message ||
      "git diff exited without a diagnostic";
    throw new Error(`Could not inspect migration history: ${diagnostic}`);
  }

  return parseMigrationChanges(result.stdout);
}

function run() {
  const baseRevision = process.argv[2] || process.env.MIGRATION_BASE_REVISION;
  const headRevision =
    process.argv[3] || process.env.MIGRATION_HEAD_REVISION || "HEAD";
  const comparisonMode =
    process.argv[4] || process.env.MIGRATION_COMPARISON_MODE || "merge-base";

  assertUsableBaseRevision(baseRevision);

  const changes = readChangesFromGit(
    baseRevision,
    headRevision,
    comparisonMode,
  );
  const violations = validateMigrationChanges(changes);

  if (violations.length > 0) {
    throw new Error(
      [
        "Applied migration history is immutable.",
        "Revert these changes and add a new timestamped migration instead:",
        ...violations.map((violation) => `- ${violation}`),
      ].join("\n"),
    );
  }

  const addedCount = changes.filter(({ status }) => status === "A").length;
  process.stdout.write(
    `Migration history is immutable; ${addedCount} new migration(s) accepted.\n`,
  );
}

const entryPoint = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined;

if (entryPoint === import.meta.url) {
  try {
    run();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Migration history check failed.";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

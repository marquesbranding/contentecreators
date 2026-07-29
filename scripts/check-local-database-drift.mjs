import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export function parseDatabaseDiff(output) {
  try {
    const parsed = JSON.parse(output);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new TypeError("Expected an object.");
    }

    return parsed;
  } catch (error) {
    const diagnostic =
      error instanceof Error ? error.message : "unknown JSON parse error";
    throw new Error(`Could not parse Supabase db diff output: ${diagnostic}`, {
      cause: error,
    });
  }
}

export function validateDatabaseDiff(result) {
  const requiredSchemas = ["public", "storage"];
  if (
    typeof result.diff !== "string" ||
    !Array.isArray(result.schemas) ||
    !requiredSchemas.every((schema) => result.schemas.includes(schema)) ||
    !Array.isArray(result.dropStatements)
  ) {
    throw new Error(
      "Supabase db diff returned an unexpected result; drift check fails closed.",
    );
  }

  const diff = result.diff.trim();
  const dropStatements = Array.isArray(result.dropStatements)
    ? result.dropStatements
    : [];

  if (diff || dropStatements.length > 0) {
    const preview = diff.slice(0, 4_000) || JSON.stringify(dropStatements);
    throw new Error(
      [
        "The local database schema differs from committed migrations.",
        "Add a new timestamped migration and keep the Drizzle schema aligned.",
        preview,
      ].join("\n"),
    );
  }
}

function runSupabaseDiff() {
  const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(
    npxCommand,
    [
      "supabase",
      "db",
      "diff",
      "--local",
      "--schema",
      "public,storage",
      "--use-pg-delta",
      "--output-format",
      "json",
      "--workdir",
      ".",
    ],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    },
  );

  if (result.error || result.status !== 0) {
    const diagnostic =
      result.error?.message || `supabase db diff exited with ${result.status}`;
    throw new Error(`Could not evaluate local database drift: ${diagnostic}`);
  }

  return parseDatabaseDiff(result.stdout.trim());
}

function run() {
  validateDatabaseDiff(runSupabaseDiff());
  process.stdout.write(
    "Local public and Storage schemas match committed Supabase migrations.\n",
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
      error instanceof Error ? error.message : "Database drift check failed.";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

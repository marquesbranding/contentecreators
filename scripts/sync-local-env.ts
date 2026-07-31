import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";

const LOCAL_ENV_PATH = new URL("../.env.local", import.meta.url);
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

function parseStatusEnvironment(output: string): Map<string, string> {
  const entries = output
    .split(/\r?\n/u)
    .map((line) => line.match(/^([A-Z0-9_]+)="([^"]*)"$/u))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => [match[1], match[2]] as const);

  return new Map(entries);
}

function requireStatusValue(
  environment: Map<string, string>,
  key: string,
): string {
  const value = environment.get(key);

  if (!value) {
    throw new Error(`Supabase local status did not provide ${key}.`);
  }

  return value;
}

function upsertEnvironmentValue(
  source: string,
  key: string,
  value: string,
): string {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "mu");

  if (pattern.test(source)) {
    return source.replace(pattern, line);
  }

  const separator = source.length === 0 || source.endsWith("\n") ? "" : "\n";

  return `${source}${separator}${line}\n`;
}

async function main() {
  const result = spawnSync(
    "supabase",
    ["status", "--workdir", ".", "-o", "env"],
    {
      encoding: "utf8",
    },
  );

  if (result.status !== 0) {
    throw new Error(
      result.stderr.trim() || "Unable to read the local Supabase status.",
    );
  }

  const status = parseStatusEnvironment(result.stdout);
  const apiUrl = requireStatusValue(status, "API_URL");
  const apiHost = new URL(apiUrl).hostname;

  if (!LOCAL_HOSTS.has(apiHost)) {
    throw new Error("Refusing to synchronize a non-local Supabase target.");
  }

  const databaseUrl = requireStatusValue(status, "DB_URL");
  const publishableKey =
    status.get("PUBLISHABLE_KEY") ?? requireStatusValue(status, "ANON_KEY");
  const secretKey =
    status.get("SECRET_KEY") ?? requireStatusValue(status, "SERVICE_ROLE_KEY");
  let localEnvironment = await readFile(LOCAL_ENV_PATH, "utf8").catch(() => "");

  for (const [key, value] of [
    ["APP_ENV", "local"],
    ["DATABASE_URL", databaseUrl],
    ["DIRECT_URL", databaseUrl],
    ["NEXT_PUBLIC_SUPABASE_URL", apiUrl],
    ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", publishableKey],
    ["SUPABASE_SERVICE_ROLE_KEY", secretKey],
  ] as const) {
    localEnvironment = upsertEnvironmentValue(localEnvironment, key, value);
  }

  await writeFile(LOCAL_ENV_PATH, localEnvironment, {
    encoding: "utf8",
    mode: 0o600,
  });
  process.stdout.write("Local Supabase environment synchronized.\n");
}

void main().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : "Local Supabase environment synchronization failed.";

  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});

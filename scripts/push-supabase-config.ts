// Pushes supabase/config.toml to the hosted project.
//
//   npm run supabase:config:push
//
// The Supabase CLI resolves `env(...)` placeholders from supabase/.env, then
// lets ambient variables override them. A shell that exported the application
// SMTP_* values (from .env.local, direnv, or `set -a`) would therefore publish
// the local mail catcher to production. This wrapper reads supabase/.env
// itself, passes those values to the CLI as the authoritative environment, and
// refuses hosts or senders that only make sense locally.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT_REF = "kstbhqeiebutpfvswyla";
const ENV_FILE = "supabase/.env";
const REQUIRED_KEYS = [
  "SUPABASE_SMTP_HOST",
  "SUPABASE_SMTP_USER",
  "SUPABASE_SMTP_PASSWORD",
  "SUPABASE_SMTP_SENDER_EMAIL",
  "SUPABASE_PRD_GOOGLE_CLIENT_ID",
  "SUPABASE_PRD_GOOGLE_SECRET",
];
const LOCAL_HOSTS = new Set(["127.0.0.1", "::1", "localhost", "mailpit"]);

function readEnvFile(path: string) {
  let contents: string;

  try {
    contents = readFileSync(resolve(path), "utf8");
  } catch {
    throw new Error(
      `${path} not found. Copy supabase/.env.example and fill it with the hosted SMTP credentials.`,
    );
  }

  const values: Record<string, string> = {};

  for (const line of contents.split("\n")) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);

    if (!match || line.trimStart().startsWith("#")) {
      continue;
    }

    values[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }

  return values;
}

function assertHostedValues(values: Record<string, string>) {
  const missing = REQUIRED_KEYS.filter((key) => !values[key]);

  if (missing.length > 0) {
    throw new Error(`${ENV_FILE} is missing: ${missing.join(", ")}`);
  }

  const host = values.SUPABASE_SMTP_HOST;
  const sender = values.SUPABASE_SMTP_SENDER_EMAIL;

  if (LOCAL_HOSTS.has(host)) {
    throw new Error(
      `Refusing to push: SUPABASE_SMTP_HOST is the local mail catcher (${host}).`,
    );
  }

  if (sender.endsWith(".test")) {
    throw new Error(
      `Refusing to push: SUPABASE_SMTP_SENDER_EMAIL is a local-only address (${sender}).`,
    );
  }

  if (values.SUPABASE_PRD_GOOGLE_CLIENT_ID.includes("placeholder")) {
    throw new Error(
      "Refusing to push: SUPABASE_PRD_GOOGLE_CLIENT_ID is a local placeholder.",
    );
  }

  return { host, sender, user: values.SUPABASE_SMTP_USER };
}

function run() {
  const values = readEnvFile(ENV_FILE);
  const target = assertHostedValues(values);

  for (const key of REQUIRED_KEYS) {
    if (process.env[key] && process.env[key] !== values[key]) {
      console.warn(
        `Ignoring the ambient ${key}; ${ENV_FILE} wins for the hosted push.`,
      );
    }
  }

  console.log(
    JSON.stringify({
      host: target.host,
      projectRef: PROJECT_REF,
      sender: target.sender,
      user: target.user,
    }),
  );

  const result = spawnSync(
    "supabase",
    ["config", "push", "--project-ref", PROJECT_REF, "--workdir", "."],
    {
      env: { ...process.env, ...values },
      shell: false,
      stdio: "inherit",
    },
  );

  if (result.error) {
    throw result.error;
  }

  process.exitCode = result.status ?? 1;
}

try {
  run();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

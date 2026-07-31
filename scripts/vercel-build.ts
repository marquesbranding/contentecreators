import { spawnSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

import postgres from "postgres";

import { assertMigrationLedger } from "../src/shared/server/deployment/hosted-deployment-target";
import { createVercelBuildPlan } from "../src/shared/server/deployment/vercel-build-plan";

function runCommand(label: string, command: string, argumentsInput: string[]) {
  process.stdout.write(`[vercel-build] ${label}\n`);

  const result = spawnSync(command, argumentsInput, {
    env: process.env,
    stdio: "inherit",
  });

  if (result.error || result.status !== 0) {
    throw new Error(`${label} failed`);
  }
}

async function committedMigrationLedger() {
  const migrationDirectory = resolve(process.cwd(), "supabase/migrations");
  const migrationFiles = (await readdir(migrationDirectory))
    .filter((fileName) => /^\d+_[a-z0-9_]+\.sql$/u.test(fileName))
    .sort();

  if (migrationFiles.length === 0) {
    throw new Error("No committed Supabase migration was found");
  }

  return migrationFiles.map((fileName) => ({
    name: fileName.slice(fileName.indexOf("_") + 1, -4),
    version: fileName.slice(0, fileName.indexOf("_")),
  }));
}

async function verifyMigrationLedger(directUrl: string) {
  const expectedMigrations = await committedMigrationLedger();
  const sql = postgres(directUrl, {
    connect_timeout: 10,
    idle_timeout: 2,
    max: 1,
    prepare: false,
  });

  try {
    const actualMigrations = await sql<{ name: string; version: string }[]>`
      select name, version
      from supabase_migrations.schema_migrations
      order by version
    `;

    assertMigrationLedger(expectedMigrations, actualMigrations);
  } finally {
    await sql.end({ timeout: 2 });
  }
}

function bootstrapProductionAdministrators(supabaseUrl: string) {
  runCommand("Bootstrap the approved production administrators", "node", [
    "--conditions=react-server",
    "--import",
    "tsx",
    "scripts/bootstrap-production-admins.ts",
    "--confirm-supabase-url",
    supabaseUrl,
    "--execute",
  ]);
}

async function main() {
  const plan = createVercelBuildPlan(process.env);

  runCommand("Compile the Next.js production artifact", "npm", [
    "run",
    "build",
  ]);

  if (plan.mode === "BUILD_ONLY") {
    process.stdout.write(
      "[vercel-build] Hosted database mutations skipped outside Vercel production\n",
    );
    return;
  }

  const migrationArguments = [
    "db",
    "push",
    "--db-url",
    plan.directUrl,
    "--yes",
    "--workdir",
    ".",
  ];

  runCommand("Dry-run pending production migrations", "supabase", [
    ...migrationArguments,
    "--dry-run",
  ]);
  runCommand(
    "Apply pending production migrations",
    "supabase",
    migrationArguments,
  );

  await verifyMigrationLedger(plan.directUrl);
  process.stdout.write("[vercel-build] Production migration ledger verified\n");

  bootstrapProductionAdministrators(plan.supabaseUrl);
}

void main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Vercel build pipeline failed";

  process.stderr.write(`[vercel-build] ${message}\n`);
  process.exitCode = 1;
});

import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

import nodemailer from "nodemailer";
import postgres from "postgres";

import { resolveServerEnvAliases } from "../src/shared/lib/env/server-env-schema";
import {
  assertDatabaseConnectionTargets,
  assertHostedDeploymentConfiguration,
  assertMigrationLedger,
  assertVercelDeploymentUrl,
  parseHostedDeploymentTarget,
  type HostedDeploymentTarget,
} from "../src/shared/server/deployment/hosted-deployment-target";

type DeploymentPhase = "pre" | "post";

interface Arguments {
  baseUrl?: string;
  phase: DeploymentPhase;
  target: HostedDeploymentTarget;
}

interface JsonBody {
  status?: unknown;
}

const REQUEST_TIMEOUT_MS = 10_000;
const REQUIRED_PRIVATE_BUCKETS = ["profile-media", "sponsorship-media"];
const REQUIRED_RLS_TABLES = [
  "accounts",
  "company_profiles",
  "creator_profiles",
  "media_assets",
];
const deploymentEnvironment = resolveServerEnvAliases(process.env);

function argumentValue(argumentsInput: string[], name: string) {
  const inlinePrefix = `--${name}=`;
  const inline = argumentsInput.find((argument) =>
    argument.startsWith(inlinePrefix),
  );

  if (inline) {
    return inline.slice(inlinePrefix.length);
  }

  const index = argumentsInput.indexOf(`--${name}`);
  return index >= 0 ? argumentsInput[index + 1] : undefined;
}

function parseArguments(argumentsInput: string[]): Arguments {
  const phase = argumentValue(argumentsInput, "phase");

  if (phase !== "pre" && phase !== "post") {
    throw new Error("Invalid deployment verification phase");
  }

  const baseUrl = argumentValue(argumentsInput, "base-url");
  const target = parseHostedDeploymentTarget(
    argumentValue(argumentsInput, "target"),
  );

  if (phase === "post" && !baseUrl) {
    throw new Error("Post-deploy verification requires --base-url");
  }

  return { baseUrl, phase, target };
}

function requiredEnvironment(name: string) {
  const configuredValue = deploymentEnvironment[name];
  const value =
    typeof configuredValue === "string" ? configuredValue.trim() : undefined;

  if (!value) {
    throw new Error(`Missing deployment configuration: ${name}`);
  }

  return value;
}

async function fetchResponse(
  label: string,
  url: string,
  expectedStatuses: readonly number[],
  init: RequestInit = {},
) {
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new Error(`Deployment verification request failed: ${label}`);
  }

  if (!expectedStatuses.includes(response.status)) {
    throw new Error(
      `Deployment verification returned an unexpected status: ${label} (${response.status})`,
    );
  }

  return response;
}

async function fetchJson(
  label: string,
  url: string,
  expectedStatuses: readonly number[],
  init: RequestInit = {},
) {
  const response = await fetchResponse(label, url, expectedStatuses, init);

  try {
    return (await response.json()) as JsonBody;
  } catch {
    throw new Error(`Deployment verification returned invalid JSON: ${label}`);
  }
}

async function verifyHostedDependencies(supabaseUrl: string) {
  await fetchResponse(
    "Supabase Auth health",
    `${supabaseUrl}/auth/v1/health`,
    [200],
  );
  await fetchResponse(
    "Supabase Storage health",
    `${supabaseUrl}/storage/v1/status`,
    [200],
  );
}

function verifySupabaseProjectIdentity(supabaseUrl: string) {
  const projectRef = requiredEnvironment("SUPABASE_PROJECT_REF");
  const hostname = new URL(supabaseUrl).hostname;

  if (hostname !== `${projectRef}.supabase.co`) {
    throw new Error("Supabase project reference does not match its API URL");
  }
}

async function verifySupabaseManagementIdentity(expectedProjectName: string) {
  const accessToken = requiredEnvironment("SUPABASE_ACCESS_TOKEN");
  const projectRef = requiredEnvironment("SUPABASE_PROJECT_REF");
  const response = await fetchResponse(
    "Supabase project identity",
    `https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}`,
    [200],
    {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    },
  );
  let project: Record<string, unknown>;

  try {
    project = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new Error("Supabase project identity returned invalid JSON");
  }

  if (project.id !== projectRef || project.name !== expectedProjectName) {
    throw new Error("Supabase project identity does not match the target");
  }
}

async function verifyVercelProjectIdentity(expectedProjectName: string) {
  let project: Record<string, unknown>;

  try {
    project = JSON.parse(
      await readFile(resolve(process.cwd(), ".vercel/project.json"), "utf8"),
    ) as Record<string, unknown>;
  } catch {
    throw new Error("Vercel project linkage is unavailable");
  }

  if (
    project.projectId !== requiredEnvironment("VERCEL_PROJECT_ID") ||
    project.orgId !== requiredEnvironment("VERCEL_ORG_ID")
  ) {
    throw new Error("Vercel project linkage does not match the target");
  }

  if (project.projectName !== expectedProjectName) {
    throw new Error("Vercel project name does not match the target");
  }
}

function verifyDatabaseProjectIdentity() {
  assertDatabaseConnectionTargets(
    requiredEnvironment("SUPABASE_PROJECT_REF"),
    requiredEnvironment("DATABASE_URL"),
    requiredEnvironment("DIRECT_URL"),
  );
}

async function localMigrationVersions() {
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

async function verifyDatabaseState() {
  const directUrl = requiredEnvironment("DIRECT_URL");
  const expectedMigrations = await localMigrationVersions();
  const sql = postgres(directUrl, {
    connect_timeout: 10,
    idle_timeout: 2,
    max: 1,
    prepare: false,
  });

  try {
    const migrationRows = await sql<{ name: string; version: string }[]>`
      select name, version
      from supabase_migrations.schema_migrations
      order by version
    `;

    assertMigrationLedger(expectedMigrations, migrationRows);

    const buckets = await sql<{ id: string; public: boolean }[]>`
      select id, public
      from storage.buckets
      where id in ('profile-media', 'sponsorship-media')
      order by id
    `;

    if (
      buckets.length !== REQUIRED_PRIVATE_BUCKETS.length ||
      buckets.some((bucket) => bucket.public)
    ) {
      throw new Error("Required Storage buckets are missing or public");
    }

    const rlsTables = await sql<{ relname: string; relrowsecurity: boolean }[]>`
      select c.relname, c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in (
          'accounts',
          'company_profiles',
          'creator_profiles',
          'media_assets'
        )
      order by c.relname
    `;

    if (
      rlsTables.length !== REQUIRED_RLS_TABLES.length ||
      rlsTables.some((table) => !table.relrowsecurity)
    ) {
      throw new Error("Required application tables are missing RLS");
    }
  } catch {
    throw new Error("Hosted database deployment verification failed");
  } finally {
    await sql.end({ timeout: 2 }).catch(() => undefined);
  }
}

async function verifyOptionalSyntheticStorageRead(supabaseUrl: string) {
  const objectPath =
    typeof deploymentEnvironment.DEPLOY_SMOKE_STORAGE_OBJECT_PATH === "string"
      ? deploymentEnvironment.DEPLOY_SMOKE_STORAGE_OBJECT_PATH.trim()
      : undefined;
  const userToken =
    typeof deploymentEnvironment.DEPLOY_SMOKE_USER_JWT === "string"
      ? deploymentEnvironment.DEPLOY_SMOKE_USER_JWT.trim()
      : undefined;

  if (!objectPath && !userToken) {
    return "not_configured";
  }

  if (!objectPath || !userToken) {
    throw new Error(
      "Synthetic Storage verification requires both path and user token",
    );
  }

  const pathSegments = objectPath.split("/");

  if (
    objectPath.length > 512 ||
    pathSegments.some(
      (segment) => !segment || segment === "." || segment === "..",
    )
  ) {
    throw new Error("Synthetic Storage verification path is invalid");
  }

  const publishableKey = requiredEnvironment(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
  const encodedObjectPath = pathSegments.map(encodeURIComponent).join("/");
  let response: Response;

  try {
    response = await fetch(
      `${supabaseUrl}/storage/v1/object/authenticated/${encodedObjectPath}`,
      {
        cache: "no-store",
        headers: {
          apikey: publishableKey,
          authorization: `Bearer ${userToken}`,
        },
        redirect: "manual",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );
  } catch {
    throw new Error("Synthetic Storage policy verification failed");
  }

  if (response.status !== 200) {
    throw new Error(
      `Synthetic Storage policy verification returned ${response.status}`,
    );
  }

  return "verified";
}

async function verifySmtpWithoutRecipient() {
  const secure = requiredEnvironment("SMTP_SECURE");
  const port = Number(requiredEnvironment("SMTP_PORT"));

  if (secure !== "true" && secure !== "false") {
    throw new Error("Invalid deployment configuration: SMTP_SECURE");
  }

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("Invalid deployment configuration: SMTP_PORT");
  }

  const transporter = nodemailer.createTransport({
    auth: {
      pass: requiredEnvironment("SMTP_PASSWORD"),
      user: requiredEnvironment("SMTP_USER"),
    },
    connectionTimeout: REQUEST_TIMEOUT_MS,
    greetingTimeout: REQUEST_TIMEOUT_MS,
    host: requiredEnvironment("SMTP_HOST"),
    port,
    secure: secure === "true",
    socketTimeout: REQUEST_TIMEOUT_MS,
  });

  try {
    await transporter.verify();
  } catch {
    throw new Error("SMTP verification failed before sending any message");
  } finally {
    transporter.close();
  }
}

async function verifyApplication(baseUrl: string) {
  const live = await fetchJson(
    "application liveness",
    `${baseUrl}/api/health/live`,
    [200],
  );
  const ready = await fetchJson(
    "application readiness",
    `${baseUrl}/api/health/ready`,
    [200],
  );
  const invalidCnpj = await fetchJson(
    "CNPJ manual-fallback boundary",
    `${baseUrl}/api/company-registry/cnpj/00000000000000`,
    [400],
  );

  if (live.status !== "ok" || ready.status !== "ready") {
    throw new Error("Application health did not report ready");
  }

  if (invalidCnpj.status !== "invalid") {
    throw new Error("CNPJ fallback boundary returned an unsafe result");
  }

  await fetchJson(
    "protected catalog denial",
    `${baseUrl}/api/catalog/creators`,
    [401, 403],
  );
  await fetchJson(
    "protected backoffice denial",
    `${baseUrl}/api/backoffice/accounts`,
    [401, 403],
  );
}

async function run() {
  const argumentsInput = parseArguments(process.argv.slice(2));
  const configuration = assertHostedDeploymentConfiguration(
    argumentsInput.target,
    {
      appEnv: requiredEnvironment("APP_ENV"),
      appUrl: requiredEnvironment("NEXT_PUBLIC_APP_URL"),
      publicSocialProofEnabled: requiredEnvironment(
        "PUBLIC_SOCIAL_PROOF_ENABLED",
      ),
      supabaseProjectName: requiredEnvironment("SUPABASE_PROJECT_NAME"),
      supabaseUrl: requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
      vercelProjectName: requiredEnvironment("VERCEL_PROJECT_NAME"),
    },
  );

  verifySupabaseProjectIdentity(configuration.supabaseUrl);
  verifyDatabaseProjectIdentity();
  await verifySupabaseManagementIdentity(configuration.expected.projectName);
  await verifyVercelProjectIdentity(configuration.expected.projectName);
  await verifyHostedDependencies(configuration.supabaseUrl);

  const checks = ["environment", "project_linkage", "auth", "storage"];

  if (argumentsInput.phase === "post") {
    const baseUrl = assertVercelDeploymentUrl(argumentsInput.baseUrl);
    await verifyDatabaseState();
    const syntheticStorage = await verifyOptionalSyntheticStorageRead(
      configuration.supabaseUrl,
    );
    await verifySmtpWithoutRecipient();
    await verifyApplication(baseUrl);
    checks.push(
      "schema",
      `storage_policy:${syntheticStorage}`,
      "smtp_verify_only",
      "cnpj_fallback",
      "catalog_denial",
      "backoffice_denial",
      "health",
    );
  }

  console.log(
    JSON.stringify({
      checks,
      phase: argumentsInput.phase,
      status: "ok",
      target: argumentsInput.target,
    }),
  );
}

run().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Deployment verification failed";

  console.error(
    JSON.stringify({
      error: message,
      status: "failed",
    }),
  );
  process.exitCode = 1;
});

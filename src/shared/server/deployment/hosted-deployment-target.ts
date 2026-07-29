export const hostedDeploymentTargets = {
  development: {
    appEnv: "development",
    githubEnvironment: "contente-creators-dev",
    projectName: "contente-creators-dev",
  },
  production: {
    appEnv: "production",
    githubEnvironment: "contente-creators-prd",
    projectName: "contente-creators-prd",
  },
} as const;

export type HostedDeploymentTarget = keyof typeof hostedDeploymentTargets;

export interface HostedDeploymentConfiguration {
  appEnv: string | undefined;
  appUrl: string | undefined;
  publicSocialProofEnabled: string | undefined;
  supabaseProjectName: string | undefined;
  supabaseUrl: string | undefined;
  vercelProjectName: string | undefined;
}

export interface MigrationIdentity {
  name: string;
  version: string;
}

const vercelDeploymentHostPattern = /^[a-z0-9-]+\.vercel\.app$/u;

function requiredValue(name: string, value: string | undefined) {
  if (!value?.trim()) {
    throw new Error(`Missing deployment configuration: ${name}`);
  }

  return value.trim();
}

function hostedHttpsUrl(name: string, value: string | undefined) {
  const rawValue = requiredValue(name, value);
  let parsed: URL;

  try {
    parsed = new URL(rawValue);
  } catch {
    throw new Error(`Invalid deployment configuration: ${name}`);
  }

  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error(`Unsafe hosted deployment configuration: ${name}`);
  }

  return parsed;
}

function postgresUrl(name: string, value: string | undefined) {
  const rawValue = requiredValue(name, value);
  let parsed: URL;

  try {
    parsed = new URL(rawValue);
  } catch {
    throw new Error(`Invalid deployment configuration: ${name}`);
  }

  if (
    (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") ||
    !parsed.hostname ||
    !parsed.username
  ) {
    throw new Error(`Invalid deployment configuration: ${name}`);
  }

  return parsed;
}

export function assertVercelDeploymentUrl(value: string | undefined) {
  const parsed = hostedHttpsUrl("VERCEL_DEPLOYMENT_URL", value);

  if (
    parsed.port ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    !vercelDeploymentHostPattern.test(parsed.hostname)
  ) {
    throw new Error("Unsafe deployment URL: VERCEL_DEPLOYMENT_URL");
  }

  return parsed.origin;
}

export function assertDatabaseConnectionTargets(
  projectRef: string | undefined,
  databaseUrl: string | undefined,
  directUrl: string | undefined,
) {
  const expectedProjectRef = requiredValue("SUPABASE_PROJECT_REF", projectRef);

  for (const [name, value] of [
    ["DATABASE_URL", databaseUrl],
    ["DIRECT_URL", directUrl],
  ] as const) {
    const connection = postgresUrl(name, value);
    const isDirectHost =
      connection.hostname === `db.${expectedProjectRef}.supabase.co`;
    const isProjectScopedPooler =
      connection.hostname.endsWith(".pooler.supabase.com") &&
      connection.username === `postgres.${expectedProjectRef}`;

    if (!isDirectHost && !isProjectScopedPooler) {
      throw new Error(
        `Database connection does not match the Supabase target: ${name}`,
      );
    }
  }
}

export function assertMigrationLedger(
  expected: readonly MigrationIdentity[],
  actual: readonly MigrationIdentity[],
) {
  if (
    actual.length !== expected.length ||
    actual.some(
      (migration, index) =>
        migration.version !== expected[index]?.version ||
        migration.name !== expected[index]?.name,
    )
  ) {
    throw new Error(
      "Hosted migration history does not match committed migrations",
    );
  }
}

export function parseHostedDeploymentTarget(
  value: string | undefined,
): HostedDeploymentTarget {
  if (value === "development" || value === "production") {
    return value;
  }

  throw new Error("Invalid deployment target");
}

export function assertHostedDeploymentConfiguration(
  target: HostedDeploymentTarget,
  configuration: HostedDeploymentConfiguration,
) {
  const expected = hostedDeploymentTargets[target];
  const appUrl = hostedHttpsUrl("NEXT_PUBLIC_APP_URL", configuration.appUrl);
  const supabaseUrl = hostedHttpsUrl(
    "NEXT_PUBLIC_SUPABASE_URL",
    configuration.supabaseUrl,
  );

  if (configuration.appEnv !== expected.appEnv) {
    throw new Error("Deployment APP_ENV does not match the target");
  }

  if (configuration.supabaseProjectName !== expected.projectName) {
    throw new Error("Supabase project name does not match the target");
  }

  if (configuration.vercelProjectName !== expected.projectName) {
    throw new Error("Vercel project name does not match the target");
  }

  if (configuration.publicSocialProofEnabled !== "false") {
    throw new Error("Public social proof must remain disabled for the Beta");
  }

  if (appUrl.origin === supabaseUrl.origin) {
    throw new Error("Application and Supabase origins must be independent");
  }

  return {
    appUrl: appUrl.origin,
    expected,
    supabaseUrl: supabaseUrl.origin,
  };
}

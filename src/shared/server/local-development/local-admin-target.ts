import "server-only";

const LOCAL_DATABASE_PORT = "54322";
const LOCAL_SUPABASE_API_PORT = "54321";
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const LOCAL_TARGET_ERROR =
  "Local administrator provisioning requires the local Supabase stack.";

interface LocalAdminProvisioningTarget {
  appEnvironment: "development" | "local" | "production";
  databaseUrl: string;
  supabaseUrl: string;
}

function isLoopbackUrl(url: URL, expectedPort: string) {
  return LOOPBACK_HOSTS.has(url.hostname) && url.port === expectedPort;
}

export function assertLocalAdminProvisioningTarget(
  target: LocalAdminProvisioningTarget,
) {
  const databaseUrl = new URL(target.databaseUrl);
  const supabaseUrl = new URL(target.supabaseUrl);
  const isLocal =
    target.appEnvironment === "local" &&
    ["postgres:", "postgresql:"].includes(databaseUrl.protocol) &&
    isLoopbackUrl(databaseUrl, LOCAL_DATABASE_PORT) &&
    supabaseUrl.protocol === "http:" &&
    isLoopbackUrl(supabaseUrl, LOCAL_SUPABASE_API_PORT);

  if (!isLocal) {
    throw new Error(LOCAL_TARGET_ERROR);
  }
}

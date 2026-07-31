import { resolveServerEnvAliases } from "@/shared/lib/env/server-env-schema";

import { assertDatabaseConnectionTargets } from "./hosted-deployment-target";

export const PRODUCTION_INITIAL_ADMINS = [
  {
    approvalReference: "CLIENTE-ADMIN-THOMAS-2026-07-30",
    email: "thomas@marquesbranding.com",
  },
  {
    approvalReference: "CLIENTE-ADMIN-IGOR-2026-07-31",
    email: "coronaigor@gmail.com",
  },
  {
    approvalReference: "CLIENTE-ADMIN-WILLIAN-2026-07-31",
    email: "willian.willalex@gmail.com",
  },
] as const;

export type VercelBuildPlan =
  | {
      mode: "BUILD_ONLY";
    }
  | {
      databaseUrl: string;
      directUrl: string;
      initialAdmins: typeof PRODUCTION_INITIAL_ADMINS;
      mode: "PRODUCTION_DEPLOY";
      projectRef: string;
      supabaseUrl: string;
    };

function requiredValue(
  environment: Record<string, unknown>,
  name: string,
): string {
  const configured = environment[name];
  const value = typeof configured === "string" ? configured.trim() : undefined;

  if (!value) {
    throw new Error(`Missing Vercel production configuration: ${name}`);
  }

  return value;
}

function requireProductionAdminPassword(
  environment: Record<string, unknown>,
): void {
  const password = requiredValue(
    environment,
    "PRODUCTION_ADMIN_INITIAL_PASSWORD",
  );

  if (password.length < 12 || password.length > 128) {
    throw new Error(
      "Invalid Vercel production configuration: PRODUCTION_ADMIN_INITIAL_PASSWORD",
    );
  }
}

function productionSupabaseTarget(environment: Record<string, unknown>): {
  projectRef: string;
  supabaseUrl: string;
} {
  const configuredUrl = requiredValue(environment, "NEXT_PUBLIC_SUPABASE_URL");
  let parsed: URL;

  try {
    parsed = new URL(configuredUrl);
  } catch {
    throw new Error("Invalid Vercel production Supabase URL");
  }

  const hostnameMatch = /^([a-z0-9-]+)\.supabase\.co$/u.exec(parsed.hostname);

  if (
    !hostnameMatch ||
    parsed.protocol !== "https:" ||
    parsed.port ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error("Unsafe Vercel production Supabase URL");
  }

  return {
    projectRef: hostnameMatch[1]!,
    supabaseUrl: parsed.origin,
  };
}

export function createVercelBuildPlan(
  input: Record<string, unknown>,
): VercelBuildPlan {
  if (input.VERCEL !== "1") {
    if (input.APP_ENV === "production") {
      throw new Error(
        "Vercel system environment variables must be exposed in production",
      );
    }

    return { mode: "BUILD_ONLY" };
  }

  if (input.VERCEL_ENV !== "production") {
    if (input.APP_ENV === "production") {
      throw new Error(
        "Production application configuration cannot run outside Vercel production",
      );
    }

    return { mode: "BUILD_ONLY" };
  }

  if (input.APP_ENV !== "production") {
    throw new Error("Vercel production build requires APP_ENV=production");
  }

  if (input.VERCEL_GIT_COMMIT_REF !== "main") {
    throw new Error("Vercel production build must originate from main");
  }

  const environment = resolveServerEnvAliases(input);
  const databaseUrl = requiredValue(environment, "DATABASE_URL");
  const directUrl = requiredValue(environment, "DIRECT_URL");
  const target = productionSupabaseTarget(environment);

  requireProductionAdminPassword(environment);
  assertDatabaseConnectionTargets(target.projectRef, databaseUrl, directUrl);

  return {
    databaseUrl,
    directUrl,
    initialAdmins: PRODUCTION_INITIAL_ADMINS,
    mode: "PRODUCTION_DEPLOY",
    projectRef: target.projectRef,
    supabaseUrl: target.supabaseUrl,
  };
}

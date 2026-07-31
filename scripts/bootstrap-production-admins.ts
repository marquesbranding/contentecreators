import { parseServerEnv } from "../src/shared/lib/env/server-env-schema";
import { PRODUCTION_INITIAL_ADMINS } from "../src/shared/server/deployment/vercel-build-plan";
import { createInitialAdminBootstrapService } from "../src/features/identity/server/services/initial-admin-bootstrap.service";

interface BootstrapArguments {
  confirmSupabaseUrl: string;
  execute: boolean;
}

function argumentValue(argumentsList: string[], flag: string) {
  const index = argumentsList.indexOf(flag);

  return index >= 0 ? argumentsList[index + 1] : undefined;
}

function parseArguments(argumentsList: string[]): BootstrapArguments {
  const confirmSupabaseUrl = argumentValue(
    argumentsList,
    "--confirm-supabase-url",
  );

  if (!confirmSupabaseUrl) {
    throw new Error("Required flag: --confirm-supabase-url.");
  }

  return {
    confirmSupabaseUrl,
    execute: argumentsList.includes("--execute"),
  };
}

async function main() {
  const argumentsInput = parseArguments(process.argv.slice(2));
  const environment = parseServerEnv(process.env);

  if (
    argumentsInput.confirmSupabaseUrl !== environment.NEXT_PUBLIC_SUPABASE_URL
  ) {
    throw new Error(
      "The confirmed Supabase URL does not match the configured environment.",
    );
  }

  if (!argumentsInput.execute) {
    process.stdout.write(
      `${JSON.stringify(
        {
          count: PRODUCTION_INITIAL_ADMINS.length,
          mode: "DRY_RUN",
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  const password = process.env.PRODUCTION_ADMIN_INITIAL_PASSWORD;

  if (!password) {
    throw new Error("Missing production administrator password.");
  }

  const bootstrap = createInitialAdminBootstrapService();

  try {
    const result = await bootstrap.productionService.bootstrap({
      admins: PRODUCTION_INITIAL_ADMINS,
      password,
      requestIdPrefix: `production-admin-${crypto.randomUUID()}`,
    });

    process.stdout.write(
      `${JSON.stringify(
        {
          count: result.count,
          mode: "EXECUTE",
          outcomes: result.outcomes,
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    await bootstrap.close();
  }
}

void main().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : "Production administrator bootstrap failed.";

  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});

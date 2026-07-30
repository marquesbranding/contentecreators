import { parseServerEnv } from "../src/shared/lib/env/server-env-schema";
import { createInitialAdminBootstrapService } from "../src/features/identity/server/services/initial-admin-bootstrap.service";

interface BootstrapArguments {
  approvalReference: string;
  confirmSupabaseUrl: string;
  email: string;
  execute: boolean;
}

function argumentValue(argumentsList: string[], flag: string) {
  const index = argumentsList.indexOf(flag);

  return index >= 0 ? argumentsList[index + 1] : undefined;
}

function parseArguments(argumentsList: string[]): BootstrapArguments {
  const email = argumentValue(argumentsList, "--email");
  const approvalReference = argumentValue(
    argumentsList,
    "--approval-reference",
  );
  const confirmSupabaseUrl = argumentValue(
    argumentsList,
    "--confirm-supabase-url",
  );

  if (!email || !approvalReference || !confirmSupabaseUrl) {
    throw new Error(
      "Required flags: --email, --approval-reference, --confirm-supabase-url.",
    );
  }

  return {
    approvalReference,
    confirmSupabaseUrl,
    email,
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

  const bootstrap = createInitialAdminBootstrapService();

  try {
    const result = await bootstrap.service.bootstrapInitial({
      approvalReference: argumentsInput.approvalReference,
      email: argumentsInput.email,
      mode: argumentsInput.execute ? "EXECUTE" : "DRY_RUN",
      requestId: `initial-admin-${crypto.randomUUID()}`,
    });

    process.stdout.write(
      `${JSON.stringify(
        {
          mode: argumentsInput.execute ? "EXECUTE" : "DRY_RUN",
          result:
            result.kind === "rejected"
              ? { code: result.code, kind: result.kind }
              : { kind: result.kind },
        },
        null,
        2,
      )}\n`,
    );

    if (result.kind === "rejected") {
      process.exitCode = 1;
    }
  } finally {
    await bootstrap.close();
  }
}

void main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Administrator bootstrap failed.";

  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});

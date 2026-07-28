import "server-only";

import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import { operationalLogger } from "../src/shared/server/observability/operational-logger";

const requestId = randomUUID();
const startedAt = Date.now();
const result = spawnSync(
  "supabase",
  ["migration", "up", "--local", "--workdir", "."],
  { stdio: "inherit" },
);
const succeeded = result.status === 0 && !result.error;

operationalLogger[succeeded ? "info" : "error"]({
  durationMs: Date.now() - startedAt,
  errorCategory: result.error ? "migration_process_error" : undefined,
  event: "migration_result",
  operation: "local_migration_up",
  outcome: succeeded ? "success" : "failed",
  requestId,
});

process.exitCode = succeeded ? 0 : result.status || 1;

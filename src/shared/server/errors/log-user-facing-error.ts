import "server-only";

import { operationalLogger } from "@/shared/server/observability/operational-logger";

import type {
  ErrorContext,
  UserFacingError,
} from "../../lib/errors/user-facing-error";

/** Only the fallback branch is worth an operational alert — every other branch is an already-understood, expected failure. */
export function logUserFacingError(
  error: unknown,
  mapped: UserFacingError,
  context: ErrorContext & { requestId: string },
) {
  if (mapped.code !== "unknown") {
    return;
  }

  operationalLogger.error({
    details: {
      errorMessage: error instanceof Error ? error.message : String(error),
    },
    errorCategory: mapped.code,
    event: "user_facing_error",
    operation: context.operation,
    outcome: "error",
    requestId: context.requestId,
  });
}

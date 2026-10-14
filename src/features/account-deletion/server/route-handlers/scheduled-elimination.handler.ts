import "server-only";

import { isValidScheduledAuthorization } from "@/features/communications/server";
import { operationalLogger } from "@/shared/server/observability/operational-logger";
import {
  requestIdResponseHeaders,
  resolveRequestId,
} from "@/shared/server/observability/request-id";

import type { EliminationSummary } from "../services/account-elimination.service";

const BATCH_SIZE = 10;
const SAFE_CODE_PATTERN = /^[A-Za-z0-9_]{1,40}$/;

interface Dependencies {
  appEnvironment: "development" | "local" | "production";
  createRequestId?: () => string;
  cronSecret: string;
  /**
   * Redacted error event. Receives only a category: never the error message,
   * stack, e-mail, name, user id or path.
   */
  logError?(input: { errorCategory: string; requestId: string }): void;
  run(input: {
    batchSize: number;
    dryRun: boolean;
    requestId: string;
  }): Promise<EliminationSummary>;
}

/**
 * Keeps only a short code (for example a SQLSTATE) from the error. Anything
 * else, including messages that may carry personal data, becomes UNEXPECTED.
 */
export function errorCategoryOf(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code: unknown }).code
      : undefined;

  return typeof code === "string" && SAFE_CODE_PATTERN.test(code)
    ? code
    : "UNEXPECTED";
}

const defaultLogError: NonNullable<Dependencies["logError"]> = ({
  errorCategory,
  requestId,
}) =>
  operationalLogger.error({
    details: { name: "scheduled_elimination_failed" },
    errorCategory,
    event: "account_lifecycle",
    operation: "account_elimination",
    outcome: "failed",
    requestId,
  });

/**
 * Daily catch-up for deletions (Storage cleanup queue, legacy FAILED accounts,
 * legal-deadline alert). Outside production the routine only reports unless
 * `?execute=1` is sent, so a stray call on a shared environment never removes
 * anything.
 */
export function createScheduledEliminationHandler({
  appEnvironment,
  createRequestId = () => crypto.randomUUID(),
  cronSecret,
  logError = defaultLogError,
  run,
}: Dependencies) {
  return async function handle(request: Request): Promise<Response> {
    const requestId = resolveRequestId(request.headers, createRequestId);
    const headers = requestIdResponseHeaders(requestId);

    if (
      !isValidScheduledAuthorization(
        request.headers.get("authorization"),
        cronSecret,
      )
    ) {
      return Response.json({ success: false }, { headers, status: 401 });
    }

    const execute = new URL(request.url).searchParams.get("execute") === "1";
    const dryRun = appEnvironment !== "production" && !execute;

    try {
      const summary = await run({ batchSize: BATCH_SIZE, dryRun, requestId });

      return Response.json({ success: true, summary }, { headers });
    } catch (error) {
      logError({ errorCategory: errorCategoryOf(error), requestId });

      return Response.json({ success: false }, { headers, status: 500 });
    }
  };
}

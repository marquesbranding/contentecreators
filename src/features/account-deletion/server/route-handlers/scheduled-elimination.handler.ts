import "server-only";

import { isValidScheduledAuthorization } from "@/features/communications/server";
import {
  requestIdResponseHeaders,
  resolveRequestId,
} from "@/shared/server/observability/request-id";

import type { EliminationSummary } from "../services/account-elimination.service";

const BATCH_SIZE = 10;

interface Dependencies {
  appEnvironment: "development" | "local" | "production";
  createRequestId?: () => string;
  cronSecret: string;
  run(input: {
    batchSize: number;
    dryRun: boolean;
    requestId: string;
  }): Promise<EliminationSummary>;
}

/**
 * Outside production the routine only reports unless `?execute=1` is sent, so
 * a stray call on a shared environment never eliminates data.
 */
export function createScheduledEliminationHandler({
  appEnvironment,
  createRequestId = () => crypto.randomUUID(),
  cronSecret,
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
    } catch {
      return Response.json({ success: false }, { headers, status: 500 });
    }
  };
}

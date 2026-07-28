import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import type { OperationalLogInput } from "@/shared/server/observability/operational-logger";
import {
  requestIdResponseHeaders,
  resolveRequestId,
} from "@/shared/server/observability/request-id";

const SCHEDULED_BATCH_SIZE = 25;
const MINIMUM_CRON_SECRET_LENGTH = 32;

export interface ScheduledOutboxProcessingResult {
  claimed: number;
  failed: number;
  sent: number;
}

export interface ScheduledOutboxProcessor {
  (input: {
    batchSize: number;
    requestId: string;
    source: "CRON";
  }): Promise<ScheduledOutboxProcessingResult>;
}

interface ScheduledOutboxHandlerDependencies {
  createRequestId?: () => string;
  cronSecret: string;
  log?: (event: OperationalLogInput) => void;
  processDue: ScheduledOutboxProcessor;
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export function isValidScheduledAuthorization(
  authorization: string | null,
  cronSecret: string,
) {
  if (!authorization || cronSecret.length < MINIMUM_CRON_SECRET_LENGTH) {
    return false;
  }

  return timingSafeEqual(digest(authorization), digest(`Bearer ${cronSecret}`));
}

export function createScheduledOutboxHandler({
  createRequestId = () => crypto.randomUUID(),
  cronSecret,
  log = () => undefined,
  processDue,
}: ScheduledOutboxHandlerDependencies) {
  return async function handle(request: Request): Promise<Response> {
    const requestId = resolveRequestId(request.headers, createRequestId);
    const responseHeaders = requestIdResponseHeaders(requestId);

    if (
      !isValidScheduledAuthorization(
        request.headers.get("authorization"),
        cronSecret,
      )
    ) {
      log({
        event: "authorization_denied",
        operation: "scheduled_email_outbox",
        outcome: "denied",
        requestId,
      });
      return Response.json(
        { success: false },
        { headers: responseHeaders, status: 401 },
      );
    }

    try {
      const result = await processDue({
        batchSize: SCHEDULED_BATCH_SIZE,
        requestId,
        source: "CRON",
      });

      if (result.failed > 0) {
        log({
          details: {
            claimed: result.claimed,
            failed: result.failed,
            sent: result.sent,
          },
          errorCategory: "delivery_failure",
          event: "email_delivery_failure",
          operation: "scheduled_email_outbox",
          outcome: "partial_failure",
          requestId,
        });
      }

      return Response.json(
        {
          ...result,
          success: true,
        },
        { headers: responseHeaders },
      );
    } catch {
      log({
        errorCategory: "processor_unavailable",
        event: "email_delivery_failure",
        operation: "scheduled_email_outbox",
        outcome: "failed",
        requestId,
      });
      return Response.json(
        { success: false },
        { headers: responseHeaders, status: 503 },
      );
    }
  };
}

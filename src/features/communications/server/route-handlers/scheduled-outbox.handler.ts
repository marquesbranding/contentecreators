import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

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
  processDue,
}: ScheduledOutboxHandlerDependencies) {
  return async function handle(request: Request): Promise<Response> {
    if (
      !isValidScheduledAuthorization(
        request.headers.get("authorization"),
        cronSecret,
      )
    ) {
      return Response.json({ success: false }, { status: 401 });
    }

    try {
      const result = await processDue({
        batchSize: SCHEDULED_BATCH_SIZE,
        requestId: createRequestId(),
        source: "CRON",
      });

      return Response.json({
        ...result,
        success: true,
      });
    } catch {
      return Response.json({ success: false }, { status: 503 });
    }
  };
}

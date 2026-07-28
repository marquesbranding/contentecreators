import "server-only";

import type { OperationalLogInput } from "@/shared/server/observability/operational-logger";
import {
  requestIdResponseHeaders,
  resolveRequestId,
} from "@/shared/server/observability/request-id";

const DEFAULT_TIMEOUT_MS = 1_500;

interface HealthRouteHandlerDependencies {
  checkReadiness?: () => Promise<void>;
  log?: (event: OperationalLogInput) => void;
  now?: () => Date;
  requestIdFactory?: () => string;
  timeoutMs?: number;
}

function boundedTimeout(timeoutMs: number) {
  return Math.max(25, Math.min(10_000, Math.round(timeoutMs)));
}

async function runWithTimeout(
  operation: () => Promise<void>,
  timeoutMs: number,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("readiness_timeout")),
          boundedTimeout(timeoutMs),
        );
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

function jsonResponse(
  body: Record<string, string>,
  requestId: string,
  status: number,
) {
  return Response.json(body, {
    headers: requestIdResponseHeaders(requestId),
    status,
  });
}

export function createHealthRouteHandlers({
  checkReadiness = async () => undefined,
  log = () => undefined,
  now = () => new Date(),
  requestIdFactory,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: HealthRouteHandlerDependencies = {}) {
  return {
    async live(request: Request) {
      const startedAt = Date.now();
      const requestId = resolveRequestId(request.headers, requestIdFactory);
      const timestamp = now().toISOString();

      log({
        durationMs: Date.now() - startedAt,
        event: "health_check",
        operation: "liveness",
        outcome: "ok",
        requestId,
      });

      return jsonResponse(
        { requestId, status: "ok", timestamp },
        requestId,
        200,
      );
    },

    async ready(request: Request) {
      const startedAt = Date.now();
      const requestId = resolveRequestId(request.headers, requestIdFactory);
      const timestamp = now().toISOString();

      try {
        await runWithTimeout(checkReadiness, timeoutMs);
        log({
          durationMs: Date.now() - startedAt,
          event: "health_check",
          operation: "readiness",
          outcome: "ready",
          requestId,
        });

        return jsonResponse(
          { requestId, status: "ready", timestamp },
          requestId,
          200,
        );
      } catch {
        log({
          durationMs: Date.now() - startedAt,
          errorCategory: "dependency_unavailable",
          event: "health_check",
          operation: "readiness",
          outcome: "unavailable",
          requestId,
        });

        return jsonResponse(
          { requestId, status: "unavailable", timestamp },
          requestId,
          503,
        );
      }
    },
  };
}

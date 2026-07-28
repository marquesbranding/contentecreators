import "server-only";

import { getDatabaseClient } from "@/db/client";

import type { RateLimitDecision } from "@/shared/server/security/rate-limit";

type ConsumeRateLimitInput = {
  keyHash: string;
  limit: number;
  scope: string;
  windowSeconds: number;
};

export async function consumePostgresRateLimit(
  input: ConsumeRateLimitInput,
): Promise<RateLimitDecision> {
  const { client } = getDatabaseClient();
  const [decision] = await client<
    {
      allowed: boolean;
      remaining: number;
      retry_after_seconds: number;
    }[]
  >`
    select
      allowed,
      remaining,
      retry_after_seconds
    from public.consume_rate_limit(
      ${input.scope},
      ${input.keyHash},
      ${input.limit},
      ${input.windowSeconds}
    )
  `;

  if (!decision) {
    throw new Error("RATE_LIMIT_DECISION_MISSING");
  }

  return {
    allowed: decision.allowed,
    remaining: decision.remaining,
    retryAfterSeconds: decision.retry_after_seconds,
  };
}

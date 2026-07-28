import "server-only";

import { createHash } from "node:crypto";

export const RATE_LIMIT_POLICIES = {
  adminCommand: {
    limit: 20,
    scope: "admin_command",
    windowSeconds: 60,
  },
  cnpjLookup: {
    limit: 8,
    scope: "cnpj_lookup",
    windowSeconds: 60,
  },
  contactReveal: {
    limit: 30,
    scope: "contact_reveal",
    windowSeconds: 5 * 60,
  },
  passwordRecovery: {
    limit: 5,
    scope: "password_recovery",
    windowSeconds: 15 * 60,
  },
  signUp: {
    limit: 5,
    scope: "sign_up",
    windowSeconds: 60 * 60,
  },
} as const;

export type RateLimitPolicyName = keyof typeof RATE_LIMIT_POLICIES;

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

interface RateLimitRepositoryInput {
  keyHash: string;
  limit: number;
  scope: string;
  windowSeconds: number;
}

interface RateLimitServiceDependencies {
  consume(input: RateLimitRepositoryInput): Promise<RateLimitDecision>;
}

export function createRateLimitKey(parts: readonly string[]) {
  const canonical = parts
    .map((part) => `${Buffer.byteLength(part, "utf8")}:${part}`)
    .join("|");

  return createHash("sha256").update(canonical).digest("hex");
}

export function createRateLimitService({
  consume,
}: RateLimitServiceDependencies) {
  return {
    consume(input: { key: string; policy: RateLimitPolicyName }) {
      const policy = RATE_LIMIT_POLICIES[input.policy];

      return consume({
        keyHash: input.key,
        limit: policy.limit,
        scope: policy.scope,
        windowSeconds: policy.windowSeconds,
      });
    },
  };
}

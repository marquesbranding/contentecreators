import "server-only";

import { z } from "zod";

export type RegistrationEmailAvailability =
  | { status: "available" }
  | { status: "invalid" }
  | { status: "rate_limited" }
  | { status: "registered" };

interface RegistrationEmailAvailabilityDependencies {
  /** True when a company or creator profile account already uses the e-mail. */
  hasRegisteredProfile(email: string): Promise<boolean>;
  /** Caps lookups per network so the check cannot be used to sweep e-mails. */
  consume(networkIdentity: string): Promise<{ allowed: boolean }>;
}

const emailSchema = z.email().max(320);

export function createRegistrationEmailAvailabilityService({
  consume,
  hasRegisteredProfile,
}: RegistrationEmailAvailabilityDependencies) {
  return {
    async check(input: {
      email: string;
      networkIdentity: string;
    }): Promise<RegistrationEmailAvailability> {
      const parsed = emailSchema.safeParse(input.email.trim().toLowerCase());

      if (!parsed.success) {
        return { status: "invalid" };
      }

      if (!(await consume(input.networkIdentity)).allowed) {
        return { status: "rate_limited" };
      }

      return (await hasRegisteredProfile(parsed.data))
        ? { status: "registered" }
        : { status: "available" };
    },
  };
}

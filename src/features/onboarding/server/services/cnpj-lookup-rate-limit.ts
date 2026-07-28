import "server-only";

import { createServerRateLimitService } from "@/features/security/server";
import { createRateLimitKey } from "@/shared/server/security/rate-limit";

export async function consumeCnpjLookupCapacity(key: string) {
  const decision = await createServerRateLimitService().consume({
    key: createRateLimitKey([key.slice(0, 160)]),
    policy: "cnpjLookup",
  });

  return decision.allowed;
}

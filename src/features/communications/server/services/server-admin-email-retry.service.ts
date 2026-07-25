import "server-only";

import { createHash } from "node:crypto";

import { createServerAdminEmailRetryRepository } from "../repositories/drizzle-admin-email-retry.repository";
import { createAdminEmailRetryService } from "./admin-email-retry.service";
import { createServerEmailDeliveryProcessor } from "./server-email-delivery.service";

function adminWorkerId(requestId: string) {
  const requestHash = createHash("sha256")
    .update(requestId)
    .digest("hex")
    .slice(0, 32);

  return `admin:${requestHash}`;
}

export async function createServerAdminEmailRetryService() {
  const repository = await createServerAdminEmailRetryRepository();
  const processor = createServerEmailDeliveryProcessor();

  return createAdminEmailRetryService({
    attemptImmediately: ({ outboxId, requestId }) =>
      processor.processOne({
        outboxId,
        workerId: adminWorkerId(requestId),
      }),
    scheduleRetry: (command) => repository.scheduleRetry(command),
  });
}

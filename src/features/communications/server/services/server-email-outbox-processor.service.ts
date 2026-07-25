import "server-only";

import type { OutboxDeliveryPort } from "../../types/outbox-processing.types";
import { createDrizzleEmailOutboxRepository } from "../repositories/drizzle-email-outbox.repository";
import { createEmailOutboxProcessor } from "./email-outbox-processor.service";

export function createServerEmailOutboxProcessor(input: {
  deliveryPort: OutboxDeliveryPort;
}) {
  return createEmailOutboxProcessor({
    deliveryPort: input.deliveryPort,
    repository: createDrizzleEmailOutboxRepository(),
  });
}

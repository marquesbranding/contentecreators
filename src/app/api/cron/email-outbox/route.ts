import {
  createScheduledOutboxHandler,
  createServerEmailDeliveryProcessor,
} from "@/features/communications/server";
import { getServerEnv } from "@/shared/server/env";
import { operationalLogger } from "@/shared/server/observability/operational-logger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const serverEnv = getServerEnv();
  const processor = createServerEmailDeliveryProcessor();
  const handle = createScheduledOutboxHandler({
    cronSecret: serverEnv.CRON_SECRET,
    log(event) {
      if (event.event === "email_delivery_failure") {
        operationalLogger.warn(event);
        return;
      }

      operationalLogger.info(event);
    },
    processDue: async ({ batchSize, requestId }) => {
      const summary = await processor.processDue({
        limit: batchSize,
        workerId: `cron:${requestId}`,
      });

      return {
        claimed: summary.claimed,
        failed: summary.failed + summary.deadLetter + summary.claimLost,
        sent: summary.sent,
      };
    },
  });

  return handle(request);
}

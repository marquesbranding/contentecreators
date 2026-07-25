import "server-only";

import {
  adminEmailRetrySchema,
  type AdminEmailRetryCommand,
} from "../../schemas/admin-email-retry-schema";

export type AdminEmailRetryScheduleResult =
  | { kind: "already_scheduled" }
  | { kind: "already_sent" }
  | { kind: "not_found" }
  | { kind: "not_retryable" }
  | {
      kind: "scheduled";
      outboxId: string;
    };

export interface AdminEmailRetryDependencies {
  attemptImmediately(input: {
    outboxId: string;
    requestId: string;
  }): Promise<unknown>;
  scheduleRetry(
    command: AdminEmailRetryCommand,
  ): Promise<AdminEmailRetryScheduleResult>;
}

export function createAdminEmailRetryService(
  dependencies: AdminEmailRetryDependencies,
) {
  return {
    async retry(input: AdminEmailRetryCommand) {
      const command = adminEmailRetrySchema.parse(input);
      const scheduled = await dependencies.scheduleRetry(command);

      if (scheduled.kind !== "scheduled") {
        return scheduled;
      }

      const delivery = await dependencies
        .attemptImmediately({
          outboxId: scheduled.outboxId,
          requestId: `${command.requestId}:delivery`,
        })
        .then(
          () => "attempted" as const,
          () => "pending" as const,
        );

      return {
        ...scheduled,
        delivery,
      };
    },
  };
}

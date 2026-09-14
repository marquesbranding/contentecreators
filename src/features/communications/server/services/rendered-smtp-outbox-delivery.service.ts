import "server-only";

import type {
  OutboxDeliveryMessage,
  OutboxDeliveryPort,
} from "../../types/outbox-processing.types";
import {
  MarquesBrandingSmtpError,
  type SmtpDeliveryReceipt,
  type SmtpMessage,
} from "./marques-branding-smtp-adapter";
import {
  renderTransactionalEmail,
  type RenderedTransactionalEmail,
} from "../templates/render-transactional-email";

type ApplicationEnvironment = "development" | "local" | "production";

interface RenderedSmtpOutboxDeliveryDependencies {
  appUrl: string;
  environment: ApplicationEnvironment;
  renderEmail?: (input: unknown) => Promise<RenderedTransactionalEmail>;
  sendSmtp(message: SmtpMessage): Promise<SmtpDeliveryReceipt>;
}

const reasonTemplates = new Set(["BANNED", "CHANGES_REQUESTED", "SUSPENDED"]);

function subjectPrefix(environment: ApplicationEnvironment) {
  if (environment === "development") {
    return "[DEV] ";
  }

  return environment === "local" ? "[LOCAL] " : "";
}

function minimumTemplatePayload(message: OutboxDeliveryMessage) {
  if (!reasonTemplates.has(message.template)) {
    return {};
  }

  const reason =
    typeof message.payload.reason === "string" ? message.payload.reason : "";

  if (message.template !== "CHANGES_REQUESTED") {
    return { reason };
  }

  return {
    reason,
    requestedFields: Array.isArray(message.payload.requestedFields)
      ? message.payload.requestedFields
      : [],
    role:
      message.payload.role === "INFLUENCER" ||
      message.payload.role === "COMPANY"
        ? message.payload.role
        : undefined,
  };
}

export function createRenderedSmtpOutboxDelivery({
  appUrl,
  environment,
  renderEmail = renderTransactionalEmail,
  sendSmtp,
}: RenderedSmtpOutboxDeliveryDependencies): OutboxDeliveryPort {
  return {
    async deliver(message) {
      let rendered: RenderedTransactionalEmail;

      try {
        rendered = await renderEmail({
          appUrl,
          payload: minimumTemplatePayload(message),
          template: message.template,
        });
      } catch {
        return {
          errorCategory: "TEMPLATE",
          errorCode: "INVALID_PAYLOAD",
          kind: "failed",
          retryable: false,
        };
      }

      try {
        const receipt = await sendSmtp({
          html: rendered.html,
          subject: `${subjectPrefix(environment)}${rendered.subject}`,
          text: rendered.text,
          to: message.recipientEmail,
        });

        return {
          kind: "sent",
          providerMessageIdHash: receipt.providerMessageIdHash,
          responseCode: receipt.responseCode,
        };
      } catch (error) {
        if (error instanceof MarquesBrandingSmtpError) {
          return {
            errorCategory: error.category,
            errorCode: error.code,
            kind: "failed",
            retryable: error.retryable,
          };
        }

        return {
          errorCategory: "UNEXPECTED",
          errorCode: "EUNKNOWN",
          kind: "failed",
          retryable: true,
        };
      }
    },
  };
}

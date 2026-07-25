import "server-only";

import { getServerEnv } from "@/shared/server/env";

import { createMarquesBrandingSmtpAdapter } from "./marques-branding-smtp-adapter";
import { createRenderedSmtpOutboxDelivery } from "./rendered-smtp-outbox-delivery.service";
import { createServerEmailOutboxProcessor } from "./server-email-outbox-processor.service";

export function createServerEmailDeliveryProcessor() {
  const serverEnv = getServerEnv();
  const smtp = createMarquesBrandingSmtpAdapter({
    fromEmail: serverEnv.SMTP_FROM_EMAIL,
    fromName: serverEnv.SMTP_FROM_NAME,
    host: serverEnv.SMTP_HOST,
    password: serverEnv.SMTP_PASSWORD,
    port: serverEnv.SMTP_PORT,
    secure: serverEnv.SMTP_SECURE,
    user: serverEnv.SMTP_USER,
  });
  const deliveryPort = createRenderedSmtpOutboxDelivery({
    appUrl: serverEnv.NEXT_PUBLIC_APP_URL,
    environment: serverEnv.APP_ENV,
    sendSmtp: (message) => smtp.send(message),
  });

  return createServerEmailOutboxProcessor({
    deliveryPort,
  });
}

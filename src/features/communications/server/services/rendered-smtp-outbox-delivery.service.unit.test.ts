import { describe, expect, it, vi } from "vitest";

import type { OutboxDeliveryMessage } from "../../types/outbox-processing.types";
import {
  MarquesBrandingSmtpError,
  type SmtpDeliveryReceipt,
} from "./marques-branding-smtp-adapter";
import { createRenderedSmtpOutboxDelivery } from "./rendered-smtp-outbox-delivery.service";

const baseMessage: OutboxDeliveryMessage = {
  idempotencyKey: "moderation-email:approval:1",
  outboxId: "99999999-9999-4999-8999-999999999999",
  payload: {
    ignoredProfileField: "must-not-reach-renderer",
  },
  recipientEmail: "synthetic@contentecreators.test",
  template: "APPROVED",
};

const rendered = {
  actionUrl: "http://localhost:3000/app/catalog",
  html: "<p>Cadastro aprovado</p>",
  subject: "Seu cadastro foi aprovado",
  template: "APPROVED" as const,
  text: "Cadastro aprovado",
};

describe("rendered SMTP outbox delivery", () => {
  it("minimizes payload, labels development and preserves the provider hash", async () => {
    const renderEmail = vi.fn(async () => rendered);
    const sendSmtp = vi.fn(async (): Promise<SmtpDeliveryReceipt> => ({
      kind: "sent",
      providerMessageIdHash: "a".repeat(64),
      responseCode: "250",
    }));
    const delivery = createRenderedSmtpOutboxDelivery({
      appUrl: "https://dev.contentecreators.test",
      environment: "development",
      renderEmail,
      sendSmtp,
    });

    await expect(delivery.deliver(baseMessage)).resolves.toEqual({
      kind: "sent",
      providerMessageIdHash: "a".repeat(64),
      responseCode: "250",
    });
    expect(renderEmail).toHaveBeenCalledWith({
      appUrl: "https://dev.contentecreators.test",
      payload: {},
      template: "APPROVED",
    });
    expect(sendSmtp).toHaveBeenCalledWith({
      html: rendered.html,
      subject: "[DEV] Seu cadastro foi aprovado",
      text: rendered.text,
      to: baseMessage.recipientEmail,
    });
  });

  it("keeps only the required correction reason", async () => {
    const renderEmail = vi.fn(async () => ({
      ...rendered,
      template: "CHANGES_REQUESTED" as const,
    }));
    const delivery = createRenderedSmtpOutboxDelivery({
      appUrl: "http://localhost:3000",
      environment: "local",
      renderEmail,
      sendSmtp: vi.fn(async () => ({ kind: "sent" as const })),
    });

    await delivery.deliver({
      ...baseMessage,
      payload: {
        privateName: "must-not-reach-renderer",
        reason: "Atualize a imagem de perfil.",
      },
      template: "CHANGES_REQUESTED",
    });

    expect(renderEmail).toHaveBeenCalledWith({
      appUrl: "http://localhost:3000",
      payload: {
        reason: "Atualize a imagem de perfil.",
      },
      template: "CHANGES_REQUESTED",
    });
  });

  it("treats an invalid template payload as terminal without contacting SMTP", async () => {
    const sendSmtp = vi.fn();
    const delivery = createRenderedSmtpOutboxDelivery({
      appUrl: "http://localhost:3000",
      environment: "local",
      renderEmail: vi.fn(async () => {
        throw new Error("Invalid transactional email contract.");
      }),
      sendSmtp,
    });

    await expect(
      delivery.deliver({
        ...baseMessage,
        payload: {},
        template: "SUSPENDED",
      }),
    ).resolves.toEqual({
      errorCategory: "TEMPLATE",
      errorCode: "INVALID_PAYLOAD",
      kind: "failed",
      retryable: false,
    });
    expect(sendSmtp).not.toHaveBeenCalled();
  });

  it("maps a redacted SMTP failure without leaking its cause", async () => {
    const delivery = createRenderedSmtpOutboxDelivery({
      appUrl: "https://contentecreators.test",
      environment: "production",
      renderEmail: vi.fn(async () => rendered),
      sendSmtp: vi.fn(async () => {
        throw new MarquesBrandingSmtpError({
          category: "AUTHENTICATION",
          code: "EAUTH",
          retryable: false,
        });
      }),
    });

    await expect(delivery.deliver(baseMessage)).resolves.toEqual({
      errorCategory: "AUTHENTICATION",
      errorCode: "EAUTH",
      kind: "failed",
      retryable: false,
    });
  });
});

import { describe, expect, it, vi } from "vitest";

import {
  createOperationalLogger,
  findSensitiveDataLeaks,
  sanitizeLogValue,
  type OperationalEventName,
} from "./operational-logger";

const requiredEvents = [
  "auth_result",
  "authorization_denied",
  "moderation_transition",
  "ban_transition",
  "banned_identity_attempt",
  "company_registry_lookup",
  "email_delivery_failure",
  "migration_result",
  "health_check",
] as const satisfies readonly OperationalEventName[];

describe("privacy-safe operational logging", () => {
  it("supports every required high-value event as bounded structured data", () => {
    const sink = vi.fn();
    const logger = createOperationalLogger({
      now: () => new Date("2026-07-28T18:00:00.000Z"),
      sink,
    });

    for (const event of requiredEvents) {
      logger.info({
        event,
        operation: "representative_operation",
        outcome: "success",
        requestId: "request-observability-test",
      });
    }

    expect(sink).toHaveBeenCalledTimes(requiredEvents.length);
    expect(sink.mock.calls.map(([, entry]) => entry.event)).toEqual(
      requiredEvents,
    );
    expect(sink.mock.calls[0]?.[1]).toMatchObject({
      level: "info",
      timestamp: "2026-07-28T18:00:00.000Z",
    });
  });

  it("redacts nested PII, secrets and provider payloads before the sink", () => {
    const sink = vi.fn();
    const logger = createOperationalLogger({ sink });

    logger.error({
      details: {
        cnpj: "11.222.333/0001-81",
        nested: {
          rawProviderResponse: {
            email: "creator@example.test",
          },
          signedUrl: "https://storage.test/object?token=signed-secret",
          smtpPassword: "smtp-secret",
          whatsapp: "(11) 99999-8888",
        },
      },
      errorCategory: "PROVIDER_FAILURE",
      event: "email_delivery_failure",
      operation: "deliver_outbox",
      outcome: "failed",
      requestId: "request-email-failure",
    });

    const [, entry] = sink.mock.calls[0]!;
    expect(findSensitiveDataLeaks(entry)).toEqual([]);
    expect(JSON.stringify(entry)).not.toContain("creator@example.test");
    expect(JSON.stringify(entry)).not.toContain("signed-secret");
    expect(JSON.stringify(entry)).not.toContain("smtp-secret");
  });

  it("detects direct leaks of every prohibited data category", () => {
    const unsafe = {
      authorization: "Bearer access-token",
      cnpj: "11222333000181",
      email: "creator@example.test",
      rawProviderPayload: { company: "Private response" },
      signedUrl: "https://storage.test/object?token=signed-secret",
      smtpSecret: "smtp-secret",
      whatsapp: "+5511999998888",
    };

    expect(findSensitiveDataLeaks(unsafe).map((leak) => leak.category)).toEqual(
      expect.arrayContaining([
        "CNPJ",
        "EMAIL",
        "PHONE",
        "PROVIDER_PAYLOAD",
        "SIGNED_URL",
        "SMTP_SECRET",
        "TOKEN",
      ]),
    );
    expect(findSensitiveDataLeaks(sanitizeLogValue(unsafe))).toEqual([]);
  });
});

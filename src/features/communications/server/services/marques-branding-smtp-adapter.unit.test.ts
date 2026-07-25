import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  createMarquesBrandingSmtpAdapter,
  MarquesBrandingSmtpError,
} from "./marques-branding-smtp-adapter";

const remoteConfig = {
  connectionTimeoutMs: 8_000,
  fromEmail: "nao-responda@marquesbranding.com.br",
  fromName: "Contente Creators",
  greetingTimeoutMs: 6_000,
  host: "smtp.marquesbranding.com.br",
  password: "smtp-secret-value",
  port: 587,
  secure: false,
  socketTimeoutMs: 20_000,
  user: "smtp-user",
};

const email = {
  html: "<p>Mensagem segura.</p>",
  subject: "Atualização do seu cadastro",
  text: "Mensagem segura.",
  to: "pessoa@example.com",
};

describe("createMarquesBrandingSmtpAdapter", () => {
  it("configures authenticated STARTTLS, TLS 1.2 minimum, and bounded timeouts", () => {
    const sendMail = vi.fn();
    const createTransport = vi.fn(() => ({ sendMail }));

    createMarquesBrandingSmtpAdapter(remoteConfig, { createTransport });

    expect(createTransport).toHaveBeenCalledWith({
      auth: {
        pass: remoteConfig.password,
        user: remoteConfig.user,
      },
      connectionTimeout: 8_000,
      disableFileAccess: true,
      disableUrlAccess: true,
      greetingTimeout: 6_000,
      host: remoteConfig.host,
      port: 587,
      requireTLS: true,
      secure: false,
      socketTimeout: 20_000,
      tls: {
        minVersion: "TLSv1.2",
        rejectUnauthorized: true,
        servername: remoteConfig.host,
      },
    });
  });

  it("permits a deliberately injected local catcher without requiring TLS", () => {
    const sendMail = vi.fn().mockResolvedValue({
      accepted: ["pessoa@example.com"],
      messageId: "local-message",
      rejected: [],
    });
    const transport = { sendMail };

    const adapter = createMarquesBrandingSmtpAdapter(
      {
        ...remoteConfig,
        host: "127.0.0.1",
        port: 1025,
      },
      { transport },
    );

    expect(adapter).toBeDefined();
    expect(transport.sendMail).not.toHaveBeenCalled();
  });

  it("configures implicit TLS only on port 465", () => {
    const createTransport = vi.fn(() => ({ sendMail: vi.fn() }));

    createMarquesBrandingSmtpAdapter(
      {
        ...remoteConfig,
        port: 465,
        secure: true,
      },
      { createTransport },
    );

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 465,
        requireTLS: false,
        secure: true,
        tls: expect.objectContaining({
          minVersion: "TLSv1.2",
          rejectUnauthorized: true,
        }),
      }),
    );
  });

  it("sends multipart content and returns only a hash of the provider message id", async () => {
    const sendMail = vi.fn().mockResolvedValue({
      accepted: ["pessoa@example.com"],
      messageId: "<provider-message-id@example.com>",
      rejected: [],
      response: "250 recipient pessoa@example.com accepted",
    });
    const adapter = createMarquesBrandingSmtpAdapter(remoteConfig, {
      transport: { sendMail },
    });

    const result = await adapter.send(email);

    expect(sendMail).toHaveBeenCalledWith({
      from: {
        address: remoteConfig.fromEmail,
        name: remoteConfig.fromName,
      },
      html: email.html,
      subject: email.subject,
      text: email.text,
      to: email.to,
    });
    expect(result).toEqual({
      kind: "sent",
      providerMessageIdHash: createHash("sha256")
        .update("<provider-message-id@example.com>")
        .digest("hex"),
      responseCode: "250",
    });
    expect(JSON.stringify(result)).not.toContain("pessoa@example.com");
  });

  it.each([
    [{ code: "EAUTH" }, "AUTHENTICATION"],
    [{ code: "ETIMEDOUT" }, "TIMEOUT"],
    [{ code: "ETLS" }, "TLS"],
    [{ code: "ECONNECTION" }, "CONNECTION"],
    [{ code: "EENVELOPE" }, "RECIPIENT"],
    [{ code: "EUNKNOWN" }, "UNKNOWN"],
  ] as const)("maps %s to a redacted %s failure", async (cause, category) => {
    const sendMail = vi.fn().mockRejectedValue({
      ...cause,
      command: "AUTH PLAIN",
      message:
        "smtp-secret-value pessoa@example.com smtp.marquesbranding.com.br",
      response: "535 pessoa@example.com smtp-secret-value",
    });
    const adapter = createMarquesBrandingSmtpAdapter(remoteConfig, {
      transport: { sendMail },
    });

    const error = await adapter.send(email).catch((caught) => caught);

    expect(error).toBeInstanceOf(MarquesBrandingSmtpError);
    expect(error).toMatchObject({
      category,
      code: cause.code,
      message: "SMTP delivery failed.",
      retryable: category !== "AUTHENTICATION" && category !== "RECIPIENT",
    });
    const serialized = JSON.stringify(error);
    expect(serialized).not.toContain("smtp-secret-value");
    expect(serialized).not.toContain("pessoa@example.com");
    expect(serialized).not.toContain("marquesbranding.com.br");
  });

  it("rejects a provider result that accepted no recipient without leaking the address", async () => {
    const sendMail = vi.fn().mockResolvedValue({
      accepted: [],
      messageId: "provider-message",
      rejected: ["pessoa@example.com"],
      response: "550 pessoa@example.com refused",
    });
    const adapter = createMarquesBrandingSmtpAdapter(remoteConfig, {
      transport: { sendMail },
    });

    const error = await adapter.send(email).catch((caught) => caught);

    expect(error).toMatchObject({
      category: "RECIPIENT",
      code: "ERECIPIENT",
      retryable: false,
    });
    expect(JSON.stringify(error)).not.toContain("pessoa@example.com");
  });

  it.each([
    [{ ...remoteConfig, connectionTimeoutMs: 0 }, "connectionTimeoutMs"],
    [{ ...remoteConfig, fromEmail: "invalid" }, "fromEmail"],
    [{ ...remoteConfig, password: "" }, "password"],
    [{ ...remoteConfig, port: 465, secure: false }, "secure"],
    [{ ...remoteConfig, port: 587, secure: true }, "secure"],
  ])("rejects invalid SMTP configuration", (config, field) => {
    expect(() => createMarquesBrandingSmtpAdapter(config)).toThrow(
      "Invalid SMTP configuration",
    );

    try {
      createMarquesBrandingSmtpAdapter(config);
    } catch (error) {
      expect(String(error)).toContain(field);
      expect(String(error)).not.toContain("smtp-secret-value");
    }
  });

  it("rejects CRLF header injection before calling the transport", async () => {
    const sendMail = vi.fn();
    const adapter = createMarquesBrandingSmtpAdapter(remoteConfig, {
      transport: { sendMail },
    });

    await expect(
      adapter.send({
        ...email,
        subject: "Aprovado\r\nBcc: attacker@example.com",
      }),
    ).rejects.toThrow("Invalid SMTP message");
    expect(sendMail).not.toHaveBeenCalled();
  });
});

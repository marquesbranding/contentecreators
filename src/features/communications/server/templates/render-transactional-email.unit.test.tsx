import { describe, expect, it } from "vitest";

import { renderTransactionalEmail } from "./render-transactional-email";

const appUrl = "https://app.contentecreators.com.br";

const cases = [
  {
    callToAction: "Acompanhar cadastro",
    expectedPath: "/app",
    subject: "Recebemos seu cadastro",
    template: "ONBOARDING_RECEIVED",
  },
  {
    callToAction: "Corrigir cadastro",
    expectedPath: "/app/profile",
    subject: "Precisamos de ajustes no seu cadastro",
    template: "CHANGES_REQUESTED",
  },
  {
    callToAction: "Acessar a plataforma",
    expectedPath: "/app/catalog",
    subject: "Seu cadastro foi aprovado",
    template: "APPROVED",
  },
  {
    callToAction: "Ver situação da conta",
    expectedPath: "/app",
    subject: "Seu acesso foi suspenso",
    template: "SUSPENDED",
  },
  {
    callToAction: "Voltar à plataforma",
    expectedPath: "/app/catalog",
    subject: "Seu acesso foi restaurado",
    template: "RESTORED",
  },
  {
    callToAction: "Ver orientações",
    expectedPath: "/app",
    subject: "Seu acesso foi bloqueado",
    template: "BANNED",
  },
  {
    callToAction: "Acessar o backoffice",
    expectedPath: "/backoffice",
    subject: "Seu acesso administrativo está disponível",
    template: "ADMIN_PROVISIONED",
  },
] as const;

describe("renderTransactionalEmail", () => {
  it.each(cases)(
    "renders the $template contract in pt-BR with one allowlisted absolute action",
    async ({ callToAction, expectedPath, subject, template }) => {
      const payload =
        template === "CHANGES_REQUESTED" ||
        template === "SUSPENDED" ||
        template === "BANNED"
          ? { reason: "Precisamos confirmar algumas informações." }
          : {};

      const result = await renderTransactionalEmail({
        appUrl,
        payload,
        template,
      });

      expect(result).toMatchObject({
        actionUrl: `${appUrl}${expectedPath}`,
        subject,
        template,
      });
      expect(result.html).toContain('lang="pt-BR"');
      expect(result.html).toContain(callToAction);
      expect(result.html).toContain(`${appUrl}${expectedPath}`);
      expect(result.html).toContain(
        `${appUrl}/brand/official/contente-creators-blue.png`,
      );
      expect(result.html).toContain("Contente Creators");
      expect(result.html).toContain("max-width:600px");
      expect(result.text).toContain(callToAction);
      expect(result.text).toContain(`${appUrl}${expectedPath}`);
      expect(result.text).not.toContain("<html");
    },
  );

  it("escapes the moderation reason in HTML while retaining readable plain text", async () => {
    const reason = 'Atualize o campo <script>alert("não")</script>.';

    const result = await renderTransactionalEmail({
      appUrl,
      payload: { reason },
      template: "CHANGES_REQUESTED",
    });

    expect(result.html).not.toContain("<script>");
    expect(result.html).toContain("&lt;script&gt;");
    expect(result.text).toContain(reason);
  });

  it.each([
    "javascript:alert(1)",
    "https://user:password@app.contentecreators.com.br",
    "https://app.contentecreators.com.br?token=secret",
    "http://app.contentecreators.com.br",
  ])("rejects unsafe application base URL %s", async (unsafeUrl) => {
    await expect(
      renderTransactionalEmail({
        appUrl: unsafeUrl,
        payload: {},
        template: "APPROVED",
      }),
    ).rejects.toThrow("Invalid transactional email contract");
  });

  it("allows HTTP only for a loopback local application URL", async () => {
    const result = await renderTransactionalEmail({
      appUrl: "http://localhost:3000/",
      payload: {},
      template: "ONBOARDING_RECEIVED",
    });

    expect(result.actionUrl).toBe("http://localhost:3000/app");
  });

  it("rejects missing or unnecessary personal data at the contract boundary", async () => {
    await expect(
      renderTransactionalEmail({
        appUrl,
        payload: {},
        template: "CHANGES_REQUESTED",
      }),
    ).rejects.toThrow("Invalid transactional email contract");

    await expect(
      renderTransactionalEmail({
        appUrl,
        payload: {
          email: "pessoa@example.com",
          reason: "Atualize a informação.",
        },
        template: "CHANGES_REQUESTED",
      }),
    ).rejects.toThrow("Invalid transactional email contract");
  });
});

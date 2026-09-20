// Validates SMTP credentials before they are pasted into Supabase Auth
// (Dashboard → Authentication → SMTP Settings) or deployed to Vercel.
//
//   npm run smtp:check                       # login only, sends nothing
//   npm run smtp:check -- --to=me@example.com # login + real test message
//
// Reads SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD,
// SMTP_FROM_EMAIL and SMTP_FROM_NAME from the environment (.env.local by
// default). The password is never printed.
import nodemailer from "nodemailer";

const TIMEOUT_MS = 15_000;

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function recipientArgument() {
  const prefix = "--to=";
  const value = process.argv
    .slice(2)
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length)
    .trim();

  if (value !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error("--to must be a valid e-mail address");
  }

  return value;
}

function describeFailure(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return { code: "EUNKNOWN" };
  }

  const { code, response, responseCode } = error as {
    code?: unknown;
    response?: unknown;
    responseCode?: unknown;
  };

  return {
    code: typeof code === "string" ? code : "EUNKNOWN",
    ...(typeof responseCode === "number" ? { responseCode } : {}),
    ...(typeof response === "string" ? { response: response.trim() } : {}),
  };
}

const hints: Record<string, string> = {
  EAUTH:
    "Usuário ou senha recusados. Confira SMTP_USER/SMTP_PASSWORD (alguns provedores exigem senha de app ou API key).",
  ECONNECTION:
    "Não conectou no host/porta. Confira SMTP_HOST/SMTP_PORT e se a porta não está bloqueada.",
  EENVELOPE:
    "Servidor recusou remetente ou destinatário. O usuário SMTP precisa ter permissão de enviar como SMTP_FROM_EMAIL.",
  ESOCKET:
    "Falha de TLS/socket. Use porta 587 com SMTP_SECURE=false ou 465 com SMTP_SECURE=true.",
  ETIMEDOUT: "Tempo esgotado. Host/porta errados ou firewall.",
};

async function run() {
  const host = requiredEnvironment("SMTP_HOST");
  const port = Number(requiredEnvironment("SMTP_PORT"));
  const secure = requiredEnvironment("SMTP_SECURE") === "true";
  const user = requiredEnvironment("SMTP_USER");
  const fromEmail = requiredEnvironment("SMTP_FROM_EMAIL");
  const fromName = requiredEnvironment("SMTP_FROM_NAME");
  const to = recipientArgument();

  const transporter = nodemailer.createTransport({
    auth: { pass: requiredEnvironment("SMTP_PASSWORD"), user },
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    host,
    port,
    secure,
    socketTimeout: TIMEOUT_MS,
  });

  const target = { from: fromEmail, host, port, secure, user };

  try {
    await transporter.verify();
    console.log(JSON.stringify({ ...target, step: "login", status: "ok" }));

    if (!to) {
      console.log(
        "Login OK. Rode com --to=seu@email para enviar uma mensagem real.",
      );
      return;
    }

    const info = await transporter.sendMail({
      from: { address: fromEmail, name: fromName },
      subject: "Teste de SMTP — Contente Creators",
      text: [
        "Se você recebeu esta mensagem, o SMTP está funcionando.",
        "",
        `Host: ${host}:${port}`,
        `Usuário: ${user}`,
        `Remetente: ${fromEmail}`,
        `Enviado em: ${new Date().toISOString()}`,
      ].join("\n"),
      to,
    });

    console.log(
      JSON.stringify({
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
        status: info.accepted.length > 0 ? "ok" : "failed",
        step: "send",
        to,
      }),
    );
    console.log(
      "Mensagem aceita pelo servidor. Confira a caixa de entrada (e o spam) de",
      to,
    );
  } catch (error) {
    const failure = describeFailure(error);

    console.error(
      JSON.stringify({ ...target, ...failure, status: "failed" }, null, 2),
    );

    if (hints[failure.code]) {
      console.error(hints[failure.code]);
    }

    process.exitCode = 1;
  } finally {
    transporter.close();
  }
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

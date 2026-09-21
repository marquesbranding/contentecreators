// Validates SMTP credentials before they are pasted into Supabase Auth
// (Dashboard → Authentication → SMTP Settings) or deployed to Vercel.
//
//   npm run smtp:check                       # login only, sends nothing
//   npm run smtp:check -- --to=me@example.com # login + real test message
//
// `npm run smtp:check:prd` runs the same check against supabase/.env, the file
// the Supabase CLI reads when pushing the hosted SMTP settings.
//
// Reads SMTP_HOST, SMTP_USER, SMTP_PASSWORD and SMTP_FROM_EMAIL from the
// environment (.env.local by default), or their SUPABASE_SMTP_* equivalents,
// which win when both are set. SMTP_PORT, SMTP_SECURE and SMTP_FROM_NAME fall
// back to the values the hosted config assumes. The password is never printed.
import nodemailer from "nodemailer";

const TIMEOUT_MS = 15_000;
const DEFAULT_PORT = 587;
const DEFAULT_SENDER_NAME = "Contente Creators";

// The hosted credentials use the SUPABASE_ prefix so that an exported
// application SMTP_* value cannot shadow them. Either set is accepted.
const HOSTED_ALIASES: Record<string, string> = {
  SMTP_FROM_EMAIL: "SUPABASE_SMTP_SENDER_EMAIL",
  SMTP_HOST: "SUPABASE_SMTP_HOST",
  SMTP_PASSWORD: "SUPABASE_SMTP_PASSWORD",
  SMTP_USER: "SUPABASE_SMTP_USER",
};

function optionalEnvironment(name: string) {
  const alias = HOSTED_ALIASES[name];

  return (
    (alias ? process.env[alias]?.trim() : undefined) ||
    process.env[name]?.trim() ||
    undefined
  );
}

function requiredEnvironment(name: string) {
  const value = optionalEnvironment(name);

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
  const port = Number(optionalEnvironment("SMTP_PORT") ?? DEFAULT_PORT);
  const secure = (optionalEnvironment("SMTP_SECURE") ?? "false") === "true";
  const user = requiredEnvironment("SMTP_USER");
  const fromEmail = requiredEnvironment("SMTP_FROM_EMAIL");
  const fromName = optionalEnvironment("SMTP_FROM_NAME") ?? DEFAULT_SENDER_NAME;
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

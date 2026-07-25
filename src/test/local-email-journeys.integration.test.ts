import { connect, type Socket } from "node:net";

import { afterEach, describe, expect, it } from "vitest";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const defaultSupabaseUrl = "http://127.0.0.1:54321";
const defaultAuthInboxUrl = "http://127.0.0.1:54324";
const defaultApplicationInboxUrl = "http://127.0.0.1:8025";
const applicationSmtpHost = "127.0.0.1";
const applicationSmtpPort = 1025;
const localRecipientDomain = "contentecreators.test";

interface MailpitAddress {
  Address: string;
  Name?: string;
}

interface MailpitMessageSummary {
  From: MailpitAddress;
  ID: string;
  Subject: string;
  To: MailpitAddress[];
}

interface MailpitSearchResponse {
  messages: MailpitMessageSummary[];
  total: number;
}

interface CapturedJourney {
  apiUrl: string;
  recipient: string;
}

const capturedJourneys: CapturedJourney[] = [];

function assertLoopbackHttpUrl(value: string) {
  const url = new URL(value);
  const loopbackHosts = new Set(["127.0.0.1", "::1", "localhost"]);

  if (url.protocol !== "http:" || !loopbackHosts.has(url.hostname)) {
    throw new Error(
      `Local email catcher must use loopback HTTP: ${url.origin}`,
    );
  }

  return url.origin;
}

function assertSyntheticLocalRecipient(recipient: string) {
  const normalizedRecipient = recipient.trim().toLowerCase();

  if (!normalizedRecipient.endsWith(`@${localRecipientDomain}`)) {
    throw new Error(
      "Local email journeys only accept synthetic .test recipients.",
    );
  }

  return normalizedRecipient;
}

async function resolveMailpitApi(candidates: Array<string | undefined>) {
  const checkedOrigins = new Set<string>();

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const origin = assertLoopbackHttpUrl(candidate);

    if (checkedOrigins.has(origin)) {
      continue;
    }

    checkedOrigins.add(origin);

    try {
      const response = await fetch(`${origin}/api/v1/info`, {
        signal: AbortSignal.timeout(2_000),
      });

      if (!response.ok) {
        continue;
      }

      const info = (await response.json()) as { Version?: unknown };

      if (typeof info.Version === "string") {
        return origin;
      }
    } catch {
      // Try the next loopback-only catcher candidate.
    }
  }

  throw new Error("No compatible local Mailpit API is available.");
}

async function searchMessages(apiUrl: string, recipient: string) {
  const query = encodeURIComponent(`to:${recipient}`);
  const response = await fetch(`${apiUrl}/api/v1/search?query=${query}`, {
    signal: AbortSignal.timeout(2_000),
  });

  if (!response.ok) {
    throw new Error(`Mailpit search failed with HTTP ${response.status}.`);
  }

  return (await response.json()) as MailpitSearchResponse;
}

async function waitForCapturedMessage(apiUrl: string, recipient: string) {
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    const inbox = await searchMessages(apiUrl, recipient);
    const message = inbox.messages.find((candidate) =>
      candidate.To.some(
        (address) => address.Address.toLowerCase() === recipient,
      ),
    );

    if (message) {
      return message;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`No local message was captured for ${recipient}.`);
}

async function deleteCapturedMessages(apiUrl: string, recipient: string) {
  const inbox = await searchMessages(apiUrl, recipient);
  const messageIds = inbox.messages
    .filter((message) =>
      message.To.some((address) => address.Address.toLowerCase() === recipient),
    )
    .map((message) => message.ID);

  if (messageIds.length === 0) {
    return;
  }

  const response = await fetch(`${apiUrl}/api/v1/messages`, {
    body: JSON.stringify({ IDs: messageIds }),
    headers: {
      "content-type": "application/json",
    },
    method: "DELETE",
    signal: AbortSignal.timeout(2_000),
  });

  if (!response.ok) {
    throw new Error(`Mailpit cleanup failed with HTTP ${response.status}.`);
  }
}

async function readSmtpResponse(socket: Socket) {
  let response = "";

  while (true) {
    response += await new Promise<string>((resolve, reject) => {
      const onClose = () => {
        cleanup();
        reject(new Error("Local SMTP connection closed unexpectedly."));
      };
      const onData = (chunk: Buffer) => {
        cleanup();
        resolve(chunk.toString("utf8"));
      };
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const cleanup = () => {
        socket.off("close", onClose);
        socket.off("data", onData);
        socket.off("error", onError);
      };

      socket.once("close", onClose);
      socket.once("data", onData);
      socket.once("error", onError);
    });

    const lines = response.trimEnd().split(/\r?\n/u);
    const finalLine = lines.at(-1);

    if (finalLine && /^\d{3} /u.test(finalLine)) {
      return response;
    }
  }
}

function expectSmtpCode(response: string, expectedCode: number) {
  const finalLine = response.trimEnd().split(/\r?\n/u).at(-1);

  if (!finalLine?.startsWith(`${expectedCode} `)) {
    throw new Error(`Local SMTP returned an unexpected response: ${finalLine}`);
  }
}

async function writeSmtpCommand(
  socket: Socket,
  command: string,
  expectedCode: number,
) {
  socket.write(`${command}\r\n`);
  expectSmtpCode(await readSmtpResponse(socket), expectedCode);
}

async function sendLocalLifecycleMessage(input: {
  recipient: string;
  subject: string;
}) {
  const recipient = assertSyntheticLocalRecipient(input.recipient);
  const sender = `no-reply@${localRecipientDomain}`;
  const socket = connect({
    host: applicationSmtpHost,
    port: applicationSmtpPort,
  });

  socket.setTimeout(5_000, () => {
    socket.destroy(new Error("Local SMTP connection timed out."));
  });

  try {
    expectSmtpCode(await readSmtpResponse(socket), 220);
    await writeSmtpCommand(socket, "EHLO localhost", 250);
    await writeSmtpCommand(socket, `MAIL FROM:<${sender}>`, 250);
    await writeSmtpCommand(socket, `RCPT TO:<${recipient}>`, 250);
    await writeSmtpCommand(socket, "DATA", 354);

    const message = [
      `From: Contente Creators Local <${sender}>`,
      `To: ${recipient}`,
      `Subject: ${input.subject}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@${localRecipientDomain}>`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "X-Contente-Creators-Environment: local",
      "X-Contente-Creators-Template: account-approved",
      "",
      "Seu cadastro foi aprovado no ambiente local.",
    ]
      .join("\r\n")
      .replace(/^\./gmu, "..");

    socket.write(`${message}\r\n.\r\n`);
    expectSmtpCode(await readSmtpResponse(socket), 250);
    await writeSmtpCommand(socket, "QUIT", 221);
  } finally {
    socket.destroy();
  }
}

afterEach(async () => {
  await Promise.all(
    capturedJourneys
      .splice(0)
      .map(({ apiUrl, recipient }) =>
        deleteCapturedMessages(apiUrl, recipient),
      ),
  );
});

describeLocalStack("local Auth and application email journeys", () => {
  it("captures a Supabase Auth signup confirmation without an external recipient", async () => {
    const supabaseUrl = assertLoopbackHttpUrl(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? defaultSupabaseUrl,
    );
    const publishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const recipient = assertSyntheticLocalRecipient(
      `auth-journey-${crypto.randomUUID()}@${localRecipientDomain}`,
    );
    const authInboxApi = await resolveMailpitApi([
      process.env.LOCAL_AUTH_MAILPIT_URL,
      process.env.INBUCKET_URL,
      defaultAuthInboxUrl,
    ]);

    if (!publishableKey) {
      throw new Error("Local Supabase publishable key is unavailable.");
    }

    capturedJourneys.push({
      apiUrl: authInboxApi,
      recipient,
    });

    const signupResponse = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      body: JSON.stringify({
        data: {
          source: "local-email-journey",
        },
        email: recipient,
        password: "LocalJourney123!",
      }),
      headers: {
        apikey: publishableKey,
        authorization: `Bearer ${publishableKey}`,
        "content-type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(5_000),
    });

    expect(signupResponse.ok).toBe(true);

    const confirmationMessage = await waitForCapturedMessage(
      authInboxApi,
      recipient,
    );
    const rawResponse = await fetch(
      `${authInboxApi}/api/v1/message/${confirmationMessage.ID}/raw`,
      {
        signal: AbortSignal.timeout(2_000),
      },
    );
    const rawMessage = await rawResponse.text();

    expect(rawResponse.ok).toBe(true);
    expect(confirmationMessage.To).toEqual([
      expect.objectContaining({
        Address: recipient,
      }),
    ]);
    expect(confirmationMessage.Subject).toMatch(/confirme seu cadastro/iu);
    expect(rawMessage.includes(`${supabaseUrl}/auth/v1/verify`)).toBe(true);
  });

  it("captures a synthetic moderation message in the application Mailpit inbox", async () => {
    const journeyId = crypto.randomUUID();
    const recipient = assertSyntheticLocalRecipient(
      `moderation-journey-${journeyId}@${localRecipientDomain}`,
    );
    const subject = `[LOCAL] Cadastro aprovado - ${journeyId}`;
    const applicationInboxApi = await resolveMailpitApi([
      process.env.LOCAL_APPLICATION_MAILPIT_URL,
      defaultApplicationInboxUrl,
    ]);

    capturedJourneys.push({
      apiUrl: applicationInboxApi,
      recipient,
    });

    await sendLocalLifecycleMessage({
      recipient,
      subject,
    });

    const lifecycleMessage = await waitForCapturedMessage(
      applicationInboxApi,
      recipient,
    );

    expect(lifecycleMessage.From.Address).toBe(
      `no-reply@${localRecipientDomain}`,
    );
    expect(lifecycleMessage.To).toEqual([
      expect.objectContaining({
        Address: recipient,
      }),
    ]);
    expect(lifecycleMessage.Subject).toBe(subject);
    expect(lifecycleMessage.Subject.startsWith("[LOCAL]")).toBe(true);
  });
});

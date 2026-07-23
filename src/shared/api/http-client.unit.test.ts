import AxiosMockAdapter from "axios-mock-adapter";
import { AxiosHeaders } from "axios";
import { afterEach, describe, expect, it } from "vitest";

import { createHttpClient } from "@/shared/api/http-client";

const clients: AxiosMockAdapter[] = [];

function setupClient() {
  const client = createHttpClient({
    requestIdFactory: () => "request-test-123",
    timeoutMs: 50,
  });
  const mock = new AxiosMockAdapter(client, { delayResponse: 100 });
  clients.push(mock);

  return { client, mock };
}

afterEach(() => {
  for (const mock of clients.splice(0)) {
    mock.restore();
  }
});

describe("createHttpClient", () => {
  it("uses same-origin credentials, a bounded timeout, and a correlation header", async () => {
    const client = createHttpClient({
      requestIdFactory: () => "request-test-123",
      timeoutMs: 4_000,
    });
    const mock = new AxiosMockAdapter(client);
    clients.push(mock);
    mock.onGet("/health").reply((config) => {
      expect(config.baseURL).toBe("/api");
      expect(config.timeout).toBe(4_000);
      expect(config.withCredentials).toBe(true);
      expect(config.headers).toBeInstanceOf(AxiosHeaders);

      if (!(config.headers instanceof AxiosHeaders)) {
        throw new Error("Expected AxiosHeaders after request interception.");
      }

      expect(config.headers.get("x-request-id")).toBe("request-test-123");

      return [200, { ok: true }];
    });

    await expect(client.get("/health")).resolves.toMatchObject({
      data: { ok: true },
    });
  });

  it("supports AbortSignal cancellation", async () => {
    const { client, mock } = setupClient();
    const controller = new AbortController();
    mock.onGet("/slow").reply(200, { ok: true });

    const request = client.get("/slow", { signal: controller.signal });
    controller.abort();

    await expect(request).rejects.toMatchObject({
      code: "CANCELED",
      status: undefined,
    });
  });

  it("normalizes timeouts without leaking adapter details", async () => {
    const { client, mock } = setupClient();
    mock.onGet("/timeout").timeout();

    await expect(client.get("/timeout")).rejects.toMatchObject({
      code: "TIMEOUT",
      message: "A solicitação demorou mais que o esperado.",
      status: undefined,
    });
  });

  it.each([
    [401, "UNAUTHORIZED", "Sua sessão expirou. Entre novamente."],
    [403, "FORBIDDEN", "Você não tem permissão para esta ação."],
    [500, "SERVER_ERROR", "Não foi possível concluir agora. Tente novamente."],
    [503, "SERVER_ERROR", "Não foi possível concluir agora. Tente novamente."],
  ] as const)("normalizes HTTP %s responses", async (status, code, message) => {
    const { client, mock } = setupClient();
    mock.onGet("/failure").reply(status, {
      message: "raw provider detail must not cross the boundary",
    });

    await expect(client.get("/failure")).rejects.toMatchObject({
      code,
      message,
      status,
    });
  });

  it("keeps only a safe validation field map for HTTP 422", async () => {
    const { client, mock } = setupClient();
    mock.onPost("/profile").reply(422, {
      message: "raw database detail",
      fieldErrors: {
        email: ["Informe um e-mail válido."],
        displayName: ["Informe seu nome."],
        nested: { secret: "do not expose" },
      },
      stack: "do not expose",
    });

    await expect(client.post("/profile", {})).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      fieldErrors: {
        email: ["Informe um e-mail válido."],
        displayName: ["Informe seu nome."],
      },
      message: "Revise os campos destacados.",
      status: 422,
    });
  });
});

import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosInstance,
} from "axios";

const DEFAULT_TIMEOUT_MS = 8_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 15_000;
const MAX_VALIDATION_FIELDS = 20;
const MAX_VALIDATION_MESSAGES_PER_FIELD = 3;
const MAX_VALIDATION_MESSAGE_LENGTH = 200;

export type HttpClientErrorCode =
  | "CANCELED"
  | "TIMEOUT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "VALIDATION_ERROR"
  | "SERVER_ERROR"
  | "NETWORK_ERROR"
  | "REQUEST_ERROR";

type ValidationFieldErrors = Readonly<Record<string, readonly string[]>>;

export class HttpClientError extends Error {
  readonly code: HttpClientErrorCode;
  readonly fieldErrors?: ValidationFieldErrors;
  readonly requestId?: string;
  readonly status?: number;

  constructor({
    code,
    fieldErrors,
    message,
    requestId,
    status,
  }: {
    code: HttpClientErrorCode;
    fieldErrors?: ValidationFieldErrors;
    message: string;
    requestId?: string;
    status?: number;
  }) {
    super(message);
    this.name = "HttpClientError";
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.requestId = requestId;
    this.status = status;
  }
}

type HttpClientOptions = {
  requestIdFactory?: () => string;
  timeoutMs?: number;
};

function createRequestId() {
  return globalThis.crypto.randomUUID();
}

function boundTimeout(timeoutMs: number | undefined) {
  if (timeoutMs === undefined) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.min(Math.max(timeoutMs, MIN_TIMEOUT_MS), MAX_TIMEOUT_MS);
}

function readRequestId(error: AxiosError) {
  const responseRequestId = error.response?.headers["x-request-id"];

  if (typeof responseRequestId === "string") {
    return responseRequestId;
  }

  const requestRequestId = error.config?.headers?.get("x-request-id");

  return typeof requestRequestId === "string" ? requestRequestId : undefined;
}

function readSafeFieldErrors(data: unknown): ValidationFieldErrors | undefined {
  if (
    typeof data !== "object" ||
    data === null ||
    !("fieldErrors" in data) ||
    typeof data.fieldErrors !== "object" ||
    data.fieldErrors === null
  ) {
    return undefined;
  }

  const entries = Object.entries(data.fieldErrors)
    .slice(0, MAX_VALIDATION_FIELDS)
    .flatMap(([field, messages]) => {
      if (!Array.isArray(messages)) {
        return [];
      }

      const safeMessages = messages
        .filter((message): message is string => typeof message === "string")
        .slice(0, MAX_VALIDATION_MESSAGES_PER_FIELD)
        .map((message) => message.slice(0, MAX_VALIDATION_MESSAGE_LENGTH));

      return safeMessages.length > 0 ? [[field, safeMessages] as const] : [];
    });

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function normalizeHttpError(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return new HttpClientError({
      code: "REQUEST_ERROR",
      message: "Não foi possível concluir a solicitação.",
    });
  }

  const requestId = readRequestId(error);
  const status = error.response?.status;

  if (error.code === "ERR_CANCELED") {
    return new HttpClientError({
      code: "CANCELED",
      message: "Solicitação cancelada.",
      requestId,
    });
  }

  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return new HttpClientError({
      code: "TIMEOUT",
      message: "A solicitação demorou mais que o esperado.",
      requestId,
    });
  }

  if (!status) {
    return new HttpClientError({
      code: "NETWORK_ERROR",
      message: "Verifique sua conexão e tente novamente.",
      requestId,
    });
  }

  if (status === 401) {
    return new HttpClientError({
      code: "UNAUTHORIZED",
      message: "Sua sessão expirou. Entre novamente.",
      requestId,
      status,
    });
  }

  if (status === 403) {
    return new HttpClientError({
      code: "FORBIDDEN",
      message: "Você não tem permissão para esta ação.",
      requestId,
      status,
    });
  }

  if (status === 429) {
    return new HttpClientError({
      code: "RATE_LIMITED",
      message: "Aguarde um pouco antes de tentar novamente.",
      requestId,
      status,
    });
  }

  if (status === 422) {
    return new HttpClientError({
      code: "VALIDATION_ERROR",
      fieldErrors: readSafeFieldErrors(error.response?.data),
      message: "Revise os campos destacados.",
      requestId,
      status,
    });
  }

  if (status >= 500) {
    return new HttpClientError({
      code: "SERVER_ERROR",
      message: "Não foi possível concluir agora. Tente novamente.",
      requestId,
      status,
    });
  }

  return new HttpClientError({
    code: "REQUEST_ERROR",
    message: "Não foi possível concluir a solicitação.",
    requestId,
    status,
  });
}

export function createHttpClient({
  requestIdFactory = createRequestId,
  timeoutMs,
}: HttpClientOptions = {}): AxiosInstance {
  const client = axios.create({
    baseURL: "/api",
    timeout: boundTimeout(timeoutMs),
    withCredentials: true,
  });

  client.interceptors.request.use((config) => {
    const headers = AxiosHeaders.from(config.headers);

    if (!headers.has("x-request-id")) {
      headers.set("x-request-id", requestIdFactory());
    }

    config.headers = headers;

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => Promise.reject(normalizeHttpError(error)),
  );

  return client;
}

export const httpClient = createHttpClient();

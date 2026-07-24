import "server-only";

import axios, { type AxiosInstance } from "axios";
import { z } from "zod";

import { isValidCnpj, normalizeCnpj } from "../../domain/cnpj";
import type { CnpjLookupResult } from "../../types/cnpj-lookup.types";

const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 150;

const brasilApiResponseSchema = z.object({
  bairro: z.string().nullish(),
  cep: z.string().nullish(),
  cnae_fiscal_descricao: z.string().nullish(),
  complemento: z.string().nullish(),
  descricao_tipo_de_logradouro: z.string().nullish(),
  logradouro: z.string().nullish(),
  municipio: z.string().nullish(),
  nome_fantasia: z.string().nullish(),
  numero: z.string().nullish(),
  razao_social: z.string().min(1),
  uf: z.string().nullish(),
});

function clean(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function createStreet(
  type: string | null | undefined,
  name: string | null | undefined,
) {
  return [clean(type), clean(name)].filter(Boolean).join(" ");
}

type BrasilApiCnpjServiceOptions = {
  wait?: (delayMs: number) => Promise<void>;
};

type ProviderFailure = Extract<
  CnpjLookupResult,
  { status: Exclude<CnpjLookupResult["status"], "success"> }
>;

function wait(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function mapProviderFailure(error: unknown): {
  result: ProviderFailure;
  retryable: boolean;
} {
  if (!axios.isAxiosError(error)) {
    return { result: { status: "unavailable" }, retryable: true };
  }

  if (error.response?.status === 404) {
    return { result: { status: "not_found" }, retryable: false };
  }

  if (error.response?.status === 429) {
    return { result: { status: "rate_limited" }, retryable: false };
  }

  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return { result: { status: "timeout" }, retryable: true };
  }

  const status = error.response?.status;

  return {
    result: { status: "unavailable" },
    retryable: status === undefined || status >= 500,
  };
}

export function createBrasilApiCnpjService(
  client: AxiosInstance,
  { wait: waitBeforeRetry = wait }: BrasilApiCnpjServiceOptions = {},
) {
  return {
    async lookup(value: string): Promise<CnpjLookupResult> {
      if (!isValidCnpj(value)) {
        return { status: "invalid" };
      }

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        try {
          const response = await client.get(
            `/api/cnpj/v1/${normalizeCnpj(value)}`,
          );
          const parsed = brasilApiResponseSchema.safeParse(response.data);

          if (!parsed.success) {
            return { status: "malformed_response" };
          }

          return {
            data: {
              city: clean(parsed.data.municipio),
              complement: clean(parsed.data.complemento),
              legalName: clean(parsed.data.razao_social),
              neighborhood: clean(parsed.data.bairro),
              number: clean(parsed.data.numero),
              postalCode: clean(parsed.data.cep).replace(/\D/gu, ""),
              segment: clean(parsed.data.cnae_fiscal_descricao),
              state: clean(parsed.data.uf).toUpperCase(),
              street: createStreet(
                parsed.data.descricao_tipo_de_logradouro,
                parsed.data.logradouro,
              ),
              tradeName:
                clean(parsed.data.nome_fantasia) ||
                clean(parsed.data.razao_social),
            },
            status: "success",
          };
        } catch (error) {
          const failure = mapProviderFailure(error);

          if (!failure.retryable || attempt === MAX_ATTEMPTS) {
            return failure.result;
          }

          await waitBeforeRetry(RETRY_DELAY_MS * attempt);
        }
      }

      return { status: "unavailable" };
    },
  };
}

export function createServerBrasilApiCnpjService() {
  return createBrasilApiCnpjService(
    axios.create({
      baseURL: "https://brasilapi.com.br",
      headers: {
        Accept: "application/json",
      },
      maxContentLength: 256_000,
      timeout: 4_000,
    }),
  );
}

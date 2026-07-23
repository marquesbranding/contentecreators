import "server-only";

import axios, { type AxiosInstance } from "axios";
import { z } from "zod";

import { isValidCnpj, normalizeCnpj } from "../../domain/cnpj";
import type { CnpjLookupResult } from "../../types/cnpj-lookup.types";

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

export function createBrasilApiCnpjService(client: AxiosInstance) {
  return {
    async lookup(value: string): Promise<CnpjLookupResult> {
      if (!isValidCnpj(value)) {
        return { status: "invalid" };
      }

      try {
        const response = await client.get(
          `/api/cnpj/v1/${normalizeCnpj(value)}`,
        );
        const parsed = brasilApiResponseSchema.safeParse(response.data);

        if (!parsed.success) {
          return { status: "not_found" };
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
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return { status: "not_found" };
        }

        return { status: "unavailable" };
      }
    },
  };
}

export function createServerBrasilApiCnpjService() {
  return createBrasilApiCnpjService(
    axios.create({
      baseURL: "https://brasilapi.com.br",
      timeout: 4_000,
    }),
  );
}

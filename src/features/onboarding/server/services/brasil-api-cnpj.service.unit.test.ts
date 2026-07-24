import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";

import { createBrasilApiCnpjService } from "./brasil-api-cnpj.service";

describe("BrasilAPI CNPJ service", () => {
  it("maps only the approved company fields", async () => {
    const client = {
      get: vi.fn().mockResolvedValue({
        data: {
          bairro: "Centro",
          cep: "01001000",
          cnae_fiscal_descricao: "Desenvolvimento de software",
          complemento: "8º andar",
          descricao_tipo_de_logradouro: "Praça",
          logradouro: "da Sé",
          municipio: "São Paulo",
          nome_fantasia: "Empresa Exemplo",
          numero: "100",
          razao_social: "Empresa Exemplo Tecnologia Ltda.",
          situacao_cadastral: 2,
          uf: "SP",
          unwanted_sensitive_field: "must not cross the boundary",
        },
      }),
    } as unknown as AxiosInstance;
    const service = createBrasilApiCnpjService(client);

    await expect(service.lookup("11222333000181")).resolves.toEqual({
      data: {
        city: "São Paulo",
        complement: "8º andar",
        legalName: "Empresa Exemplo Tecnologia Ltda.",
        neighborhood: "Centro",
        number: "100",
        postalCode: "01001000",
        segment: "Desenvolvimento de software",
        state: "SP",
        street: "Praça da Sé",
        tradeName: "Empresa Exemplo",
      },
      status: "success",
    });
  });

  it("rejects invalid CNPJ without calling the provider", async () => {
    const client = { get: vi.fn() } as unknown as AxiosInstance;
    const service = createBrasilApiCnpjService(client);

    await expect(service.lookup("123")).resolves.toEqual({
      status: "invalid",
    });
    expect(client.get).not.toHaveBeenCalled();
  });

  it("returns a manual-entry state when the provider is unavailable", async () => {
    const client = {
      get: vi
        .fn()
        .mockRejectedValue({ isAxiosError: true, response: { status: 503 } }),
    } as unknown as AxiosInstance;
    const wait = vi.fn().mockResolvedValue(undefined);
    const service = createBrasilApiCnpjService(client, { wait });

    await expect(service.lookup("11222333000181")).resolves.toEqual({
      status: "unavailable",
    });
    expect(client.get).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledTimes(1);
  });

  it("returns not found without retrying HTTP 404", async () => {
    const client = {
      get: vi
        .fn()
        .mockRejectedValue({ isAxiosError: true, response: { status: 404 } }),
    } as unknown as AxiosInstance;
    const wait = vi.fn().mockResolvedValue(undefined);
    const service = createBrasilApiCnpjService(client, { wait });

    await expect(service.lookup("11222333000181")).resolves.toEqual({
      status: "not_found",
    });
    expect(client.get).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });

  it("returns a typed malformed-response state without exposing raw data", async () => {
    const client = {
      get: vi.fn().mockResolvedValue({
        data: {
          cnpj: "11222333000181",
          nome_fantasia: "Sem razão social",
          raw_private_field: "must stay at the provider boundary",
        },
      }),
    } as unknown as AxiosInstance;
    const service = createBrasilApiCnpjService(client);

    await expect(service.lookup("11222333000181")).resolves.toEqual({
      status: "malformed_response",
    });
  });

  it("returns a typed timeout after one bounded retry", async () => {
    const client = {
      get: vi.fn().mockRejectedValue({ code: "ETIMEDOUT", isAxiosError: true }),
    } as unknown as AxiosInstance;
    const wait = vi.fn().mockResolvedValue(undefined);
    const service = createBrasilApiCnpjService(client, { wait });

    await expect(service.lookup("11222333000181")).resolves.toEqual({
      status: "timeout",
    });
    expect(client.get).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledTimes(1);
  });

  it("returns a typed provider rate-limit state without retrying", async () => {
    const client = {
      get: vi
        .fn()
        .mockRejectedValue({ isAxiosError: true, response: { status: 429 } }),
    } as unknown as AxiosInstance;
    const wait = vi.fn().mockResolvedValue(undefined);
    const service = createBrasilApiCnpjService(client, { wait });

    await expect(service.lookup("11222333000181")).resolves.toEqual({
      status: "rate_limited",
    });
    expect(client.get).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });

  it("recovers when the single provider retry succeeds", async () => {
    const client = {
      get: vi
        .fn()
        .mockRejectedValueOnce({
          isAxiosError: true,
          response: { status: 502 },
        })
        .mockResolvedValueOnce({
          data: {
            municipio: "Recife",
            razao_social: "Empresa Recuperada Ltda.",
            uf: "PE",
          },
        }),
    } as unknown as AxiosInstance;
    const service = createBrasilApiCnpjService(client, {
      wait: vi.fn().mockResolvedValue(undefined),
    });

    await expect(service.lookup("11222333000181")).resolves.toMatchObject({
      data: {
        city: "Recife",
        legalName: "Empresa Recuperada Ltda.",
        state: "PE",
      },
      status: "success",
    });
    expect(client.get).toHaveBeenCalledTimes(2);
  });
});

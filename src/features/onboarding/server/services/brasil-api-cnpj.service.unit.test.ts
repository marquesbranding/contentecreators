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
      get: vi.fn().mockRejectedValue(new Error("timeout")),
    } as unknown as AxiosInstance;
    const service = createBrasilApiCnpjService(client);

    await expect(service.lookup("11222333000181")).resolves.toEqual({
      status: "unavailable",
    });
  });
});

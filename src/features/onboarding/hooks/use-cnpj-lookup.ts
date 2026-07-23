"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { createHttpClient } from "@/shared/api/http-client";

import { isValidCnpj, normalizeCnpj } from "../domain/cnpj";
import type { CnpjLookupResult } from "../types/cnpj-lookup.types";

const httpClient = createHttpClient({ timeoutMs: 6_000 });

function useDebouncedValue(value: string, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [delayMs, value]);

  return debouncedValue;
}

export function useCnpjLookup(cnpj: string) {
  const normalizedCnpj = normalizeCnpj(cnpj);
  const debouncedCnpj = useDebouncedValue(normalizedCnpj, 450);
  const enabled = isValidCnpj(debouncedCnpj);

  return useQuery({
    enabled,
    queryFn: async ({ signal }) => {
      const response = await httpClient.get<CnpjLookupResult>(
        `/company-registry/cnpj/${debouncedCnpj}`,
        { signal },
      );
      return response.data;
    },
    queryKey: ["company-cnpj", debouncedCnpj],
    retry: false,
    staleTime: 5 * 60 * 1_000,
  });
}

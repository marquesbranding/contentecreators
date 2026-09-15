"use client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { httpClient } from "@/shared/api/http-client";
import { SearchableSelect } from "@/shared/components/ui/searchable-select";
import { Button } from "@/shared/components/ui/button";
import {
  eligibleCreatorsResponseSchema,
  type EligibleCreator,
} from "../api/eligible-creators.contract";
export function PlacementCreatorPicker({
  value,
  onChange,
  onSelection,
}: {
  value: string;
  onChange(value: string): void;
  onSelection(value: EligibleCreator | null): void;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useQuery({
    queryKey: [
      "backoffice",
      "sponsorships",
      "eligible-creators",
      debounced,
      value,
    ],
    queryFn: async ({ signal }) => {
      const response = await httpClient.get(
        "/backoffice/sponsorships/creators",
        {
          signal,
          params: { search: debounced, selectedId: value || undefined },
        },
      );
      return eligibleCreatorsResponseSchema.parse(response.data);
    },
  });
  const selected = query.data?.items.find((item) => item.id === value) ?? null;
  useEffect(() => {
    if (query.isSuccess) onSelection(selected);
  }, [selected, query.isSuccess, onSelection]);
  return (
    <div className="space-y-2">
      <SearchableSelect
        id="sponsorship-featured-creator"
        placeholder="Busque pelo nome do criador"
        items={Object.fromEntries(
          (query.data?.items ?? []).map((item) => [
            item.id,
            `${item.displayName}${item.location ? ` · ${item.location}` : ""}`,
          ]),
        )}
        value={value || null}
        onInput={(event) => setSearch(event.currentTarget.value)}
        onValueChange={(id) => onChange(id ?? "")}
      />
      <p className="text-muted-foreground text-sm" role="status">
        {query.isPending
          ? "Buscando criadores…"
          : query.isError
            ? "Não foi possível carregar os criadores."
            : !query.data?.items.length
              ? "Nenhum criador elegível encontrado. Tente outro nome."
              : "Somente criadores aprovados com perfil 100% completo."}
      </p>
      {query.isError ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => void query.refetch()}
        >
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}

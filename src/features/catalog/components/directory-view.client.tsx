"use client";

import { Search, ShieldX } from "lucide-react";
import type { ReactNode } from "react";
import {
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/shared/components/ui/input-group";
import { accountTypeLabels } from "@/shared/domain/account-type-labels";

import { useDirectory } from "../hooks/use-directory";
import { useDirectoryUrlState } from "../hooks/directory-url-state";
import type {
  CatalogNicheDto,
  CatalogSocialPlatform,
} from "../types/creator-catalog.types";
import type { DirectoryFilters } from "../types/catalog-directory.types";
import type {
  DirectoryActiveFilter,
  DirectoryActiveFilterKey,
} from "./directory-filter-controls.client";
import { DirectoryFilterControls } from "./directory-filter-controls.client";
import { DirectoryResults } from "./directory-results";

const platformLabels: Record<CatalogSocialPlatform, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  OTHER: "Outra rede",
  TELEGRAM: "Telegram",
  THREADS: "Threads",
  TIKTOK: "TikTok",
  X: "X",
  YOUTUBE: "YouTube",
};

const SEARCH_DEBOUNCE_MS = 300;

function DirectorySearch({
  isPending,
  onSearchChange,
  value,
}: {
  isPending: boolean;
  onSearchChange: (value: string) => void;
  value: string;
}) {
  const [localValue, setLocalValue] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  if (value !== syncedValue) {
    setSyncedValue(value);
    setLocalValue(value);
  }

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  return (
    <InputGroup className="w-full sm:w-72">
      <InputGroupAddon>
        <Search aria-hidden="true" className="text-muted-foreground size-4" />
      </InputGroupAddon>
      <InputGroupInput
        aria-label="Buscar empresas ou criadores"
        disabled={isPending}
        onChange={(event) => {
          const nextValue = event.target.value;
          setLocalValue(nextValue);
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            onSearchChange(nextValue.trim());
          }, SEARCH_DEBOUNCE_MS);
        }}
        placeholder="Buscar"
        type="search"
        value={localValue}
      />
    </InputGroup>
  );
}

function activeFilterList(
  filters: DirectoryFilters,
  nicheOptions: CatalogNicheDto[],
): DirectoryActiveFilter[] {
  const typeLabels: Record<string, string> = {
    COMPANY: accountTypeLabels.COMPANY,
    INFLUENCER: accountTypeLabels.INFLUENCER,
    UGC: accountTypeLabels.UGC,
  };
  const entries: DirectoryActiveFilter[] = (filters.type ?? []).map((type) => ({
    key: "type",
    label: `Tipo: ${typeLabels[type]}`,
    value: type,
  }));

  const singleValueLabels: Partial<
    Record<DirectoryActiveFilterKey, string | undefined>
  > = {
    city: filters.city ? `Cidade: ${filters.city}` : undefined,
    followersMax:
      filters.followersMax !== undefined
        ? `Até ${filters.followersMax} seguidores`
        : undefined,
    followersMin:
      filters.followersMin !== undefined
        ? `A partir de ${filters.followersMin} seguidores`
        : undefined,
    niche: filters.niche
      ? `Nicho: ${
          nicheOptions.find((option) => option.slug === filters.niche)?.name ??
          filters.niche
        }`
      : undefined,
    platform: filters.platform
      ? `Rede: ${platformLabels[filters.platform]}`
      : undefined,
    search: filters.search ? `Busca: ${filters.search}` : undefined,
    segment: filters.segment ? `Segmento: ${filters.segment}` : undefined,
    state: filters.state ? `UF: ${filters.state}` : undefined,
  };

  for (const [key, label] of Object.entries(singleValueLabels)) {
    if (label) {
      entries.push({ key: key as DirectoryActiveFilterKey, label });
    }
  }

  return entries;
}

export function DirectoryView({
  midlistSlots,
}: {
  midlistSlots?: ReactNode[];
}) {
  const { clearFilters, filters, updateFilters } = useDirectoryUrlState();
  const [optimisticFilters, addOptimisticFiltersPatch] = useOptimistic(
    filters,
    (
      current,
      patch: Partial<Omit<DirectoryFilters, "cursor">> | "clear",
    ): DirectoryFilters => {
      if (patch === "clear") {
        return { pageSize: current.pageSize };
      }

      return { ...current, ...patch, cursor: undefined };
    },
  );
  const [isNavigationPending, startTransition] = useTransition();
  const directory = useDirectory({ filters });
  const nicheOptions = useMemo(
    () => directory.facets?.niches ?? [],
    [directory.facets],
  );
  const activeFilters = activeFilterList(optimisticFilters, nicheOptions);
  const options = useMemo(
    () => ({
      cities: directory.facets?.cities ?? [],
      niches: nicheOptions,
      segments: directory.facets?.segments ?? [],
      states: directory.facets?.states ?? [],
    }),
    [directory.facets, nicheOptions],
  );

  function navigate(
    patch: Partial<Omit<DirectoryFilters, "cursor">> | "clear",
  ) {
    startTransition(() => {
      addOptimisticFiltersPatch(patch);
      if (patch === "clear") {
        clearFilters();
      } else {
        updateFilters(patch);
      }
    });
  }

  function removeFilter(key: DirectoryActiveFilterKey, value?: string) {
    if (key === "type" && value) {
      const next = (optimisticFilters.type ?? []).filter(
        (type) => type !== value,
      );
      navigate({ type: next.length > 0 ? next : undefined });
      return;
    }

    navigate({ [key]: undefined });
  }

  if (directory.isAuthorizationStale) {
    return (
      <Alert
        aria-live="assertive"
        className="rounded-2xl bg-white p-5"
        variant="destructive"
      >
        <ShieldX aria-hidden="true" />
        <AlertTitle>Seu acesso ao catálogo mudou</AlertTitle>
        <AlertDescription>
          Os dados protegidos foram removidos deste dispositivo. Atualize a
          página para verificar a situação atual do seu cadastro.
        </AlertDescription>
      </Alert>
    );
  }

  const isPending =
    isNavigationPending ||
    (directory.isFetching && !directory.isFetchingNextPage);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <DirectorySearch
          isPending={isPending}
          onSearchChange={(search) => navigate({ search: search || undefined })}
          value={optimisticFilters.search ?? ""}
        />
        <DirectoryFilterControls
          activeFilters={activeFilters}
          filters={optimisticFilters}
          isPending={isPending}
          onClearFilters={() => navigate("clear")}
          onFiltersChange={(patch) => navigate(patch)}
          onRemoveFilter={removeFilter}
          options={options}
        />
      </div>

      <p aria-live="polite" className="sr-only" role="status">
        {directory.announcement}
      </p>

      <DirectoryResults
        hasActiveFilters={activeFilters.length > 0}
        hasNextPage={directory.hasNextPage}
        isFetchingNextPage={directory.isFetchingNextPage}
        items={directory.items}
        midlistSlots={midlistSlots}
        onClearFilters={() => navigate("clear")}
        onLoadMore={() => void directory.fetchNextPage()}
        onRetry={() => void directory.refetch()}
        status={
          directory.isPending
            ? "loading"
            : directory.isError
              ? "error"
              : "success"
        }
      />
    </div>
  );
}

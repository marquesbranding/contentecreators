"use client";

import { ShieldX } from "lucide-react";
import { useMemo, useTransition } from "react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";

import type { CreatorCatalogBrowserCardDto } from "../api/creator-catalog.contract";
import {
  hasCreatorCatalogActiveFilters,
  useCreatorCatalogUrlState,
} from "../hooks/catalog-url-state";
import { useCreatorCatalog } from "../hooks/use-creator-catalog";
import type {
  CatalogSocialPlatform,
  CreatorCatalogFilters,
} from "../types/creator-catalog.types";
import type {
  CatalogActiveFilter,
  CatalogFilterOptions,
} from "./catalog-filter-controls.client";
import { CatalogFilterControls } from "./catalog-filter-controls.client";
import type { CatalogCreatorCardViewModel } from "./catalog-creator-card";
import { CatalogResults } from "./catalog-results";

const nicheOptions = [
  { label: "Beleza", value: "beleza" },
  { label: "Fitness", value: "fitness" },
  { label: "Moda", value: "moda" },
  { label: "Tecnologia", value: "tecnologia" },
];

const brazilianStates = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

const platformLabels: Record<CatalogSocialPlatform, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  OTHER: "Outra rede",
  TIKTOK: "TikTok",
  X: "X",
  YOUTUBE: "YouTube",
};

function formatMetricValue(value: number, style: "engagement" | "followers") {
  return style === "followers"
    ? new Intl.NumberFormat("pt-BR", {
        compactDisplay: "short",
        notation: "compact",
      }).format(value)
    : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value)}%`;
}

function toCardViewModel(
  creator: CreatorCatalogBrowserCardDto,
): CatalogCreatorCardViewModel {
  const metric = creator.metrics?.[0];
  const metrics = metric
    ? [
        ...(metric.followerCount === null
          ? []
          : [
              {
                label: `${platformLabels[metric.platform]} · seguidores`,
                value: formatMetricValue(metric.followerCount, "followers"),
              },
            ]),
        ...(metric.engagementRate === null
          ? []
          : [
              {
                label: `${platformLabels[metric.platform]} · engajamento`,
                value: formatMetricValue(metric.engagementRate, "engagement"),
              },
            ]),
      ]
    : [];

  return {
    ...creator,
    detailHref: `/app/creators/${creator.creatorId}`,
    media: creator.avatar
      ? {
          alt: `Foto de perfil de ${creator.displayName}`,
          src: creator.avatar.url,
        }
      : null,
    metrics,
  };
}

function activeFilterLabels(
  filters: CreatorCatalogFilters,
): CatalogActiveFilter[] {
  const labels: Partial<
    Record<CatalogActiveFilter["key"], string | undefined>
  > = {
    city: filters.city ? `Cidade: ${filters.city}` : undefined,
    creatorType: filters.creatorType
      ? `Tipo: ${filters.creatorType === "UGC" ? "Criador UGC" : "Influenciador"}`
      : undefined,
    niche: filters.niche
      ? `Nicho: ${
          nicheOptions.find((option) => option.value === filters.niche)
            ?.label ?? filters.niche
        }`
      : undefined,
    platform: filters.platform
      ? `Rede: ${platformLabels[filters.platform]}`
      : undefined,
    search: filters.search ? `Busca: ${filters.search}` : undefined,
    state: filters.state ? `UF: ${filters.state}` : undefined,
  };

  return Object.entries(labels).flatMap(([key, label]) =>
    label ? [{ key: key as CatalogActiveFilter["key"], label }] : [],
  );
}

export function CreatorCatalogView() {
  const { clearFilters, filters, updateFilters } = useCreatorCatalogUrlState();
  const [isNavigationPending, startTransition] = useTransition();
  const catalog = useCreatorCatalog({ filters });
  const items = catalog.items.map(toCardViewModel);
  const activeFilters = activeFilterLabels(filters);
  const options = useMemo<CatalogFilterOptions>(() => {
    const cities = new Set(
      catalog.items.flatMap((creator) => (creator.city ? [creator.city] : [])),
    );

    if (filters.city) {
      cities.add(filters.city);
    }

    return {
      cities: [...cities].sort((left, right) =>
        left.localeCompare(right, "pt-BR"),
      ),
      niches: nicheOptions,
      states: brazilianStates,
    };
  }, [catalog.items, filters.city]);

  function navigate(
    patch: Partial<Omit<CreatorCatalogFilters, "cursor">> | "clear",
  ) {
    startTransition(() => {
      if (patch === "clear") {
        clearFilters();
      } else {
        updateFilters(patch);
      }
    });
  }

  if (catalog.isAuthorizationStale) {
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

  return (
    <div className="space-y-7">
      <CatalogFilterControls
        activeFilters={activeFilters}
        filters={filters}
        isPending={
          isNavigationPending ||
          (catalog.isFetching && !catalog.isFetchingNextPage)
        }
        onClearFilters={() => navigate("clear")}
        onFiltersChange={(patch) => navigate(patch)}
        onRemoveFilter={(key) => navigate({ [key]: undefined })}
        onSearchSubmit={(search) => navigate({ search: search || undefined })}
        options={options}
      />

      <p aria-live="polite" className="sr-only" role="status">
        {catalog.announcement}
      </p>

      <CatalogResults
        hasActiveFilters={hasCreatorCatalogActiveFilters(filters)}
        hasNextPage={catalog.hasNextPage}
        isFetchingNextPage={catalog.isFetchingNextPage}
        items={items}
        onClearFilters={() => navigate("clear")}
        onLoadMore={() => void catalog.fetchNextPage()}
        onRetry={() => void catalog.refetch()}
        status={
          catalog.isPending ? "loading" : catalog.isError ? "error" : "success"
        }
      />
    </div>
  );
}

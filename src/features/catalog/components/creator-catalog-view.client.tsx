"use client";

import { ShieldX } from "lucide-react";
import { useMemo, useOptimistic, useTransition } from "react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";

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
  { label: "Gastronomia", value: "gastronomia" },
  { label: "Moda", value: "moda" },
  { label: "Tecnologia", value: "tecnologia" },
  { label: "Viagem", value: "viagem" },
];

const companyDiscoveryShortcuts = [
  { key: "niche" as const, label: "Beleza", value: "beleza" },
  { key: "niche" as const, label: "Gastronomia", value: "gastronomia" },
  { key: "niche" as const, label: "Moda", value: "moda" },
  { key: "niche" as const, label: "Tecnologia", value: "tecnologia" },
  { key: "niche" as const, label: "Viagem", value: "viagem" },
  { key: "platform" as const, label: "Instagram", value: "INSTAGRAM" },
  { key: "platform" as const, label: "TikTok", value: "TIKTOK" },
  { key: "platform" as const, label: "YouTube", value: "YOUTUBE" },
] satisfies ReadonlyArray<{
  key: "niche" | "platform";
  label: string;
  value: string;
}>;

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
  TELEGRAM: "Telegram",
  THREADS: "Threads",
  TIKTOK: "TikTok",
  X: "X",
  YOUTUBE: "YouTube",
};

function formatMetricValue(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    compactDisplay: "short",
    notation: "compact",
  }).format(value);
}

function toCardViewModel(
  creator: CreatorCatalogBrowserCardDto,
): CatalogCreatorCardViewModel {
  const metric =
    creator.metrics?.find((candidate) => candidate.isPrimary) ??
    creator.metrics?.[0];
  const metrics = metric
    ? [
        ...(metric.followerCount === null
          ? []
          : [
              {
                label: `${platformLabels[metric.platform]} · seguidores`,
                value: formatMetricValue(metric.followerCount),
              },
            ]),
        ...(metric.viewCount === null
          ? []
          : [
              {
                label: `${platformLabels[metric.platform]} · visualizações`,
                value: formatMetricValue(metric.viewCount),
              },
            ]),
        ...(metric.interactionCount === null
          ? []
          : [
              {
                label: `${platformLabels[metric.platform]} · interações`,
                value: formatMetricValue(metric.interactionCount),
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

export function CreatorCatalogView({
  viewerRole,
}: {
  viewerRole: "COMPANY" | "INFLUENCER";
}) {
  const { clearFilters, filters, updateFilters } = useCreatorCatalogUrlState();
  const [optimisticFilters, addOptimisticFiltersPatch] = useOptimistic(
    filters,
    (
      current,
      patch: Partial<Omit<CreatorCatalogFilters, "cursor">> | "clear",
    ): CreatorCatalogFilters => {
      if (patch === "clear") {
        return {
          pageSize: current.pageSize,
        };
      }

      return {
        ...current,
        ...patch,
        cursor: undefined,
      };
    },
  );
  const [isNavigationPending, startTransition] = useTransition();
  const catalog = useCreatorCatalog({ filters });
  const items = catalog.items.map(toCardViewModel);
  const activeFilters = activeFilterLabels(optimisticFilters);
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
      addOptimisticFiltersPatch(patch);
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
    <div className="space-y-5">
      <CatalogFilterControls
        activeFilters={activeFilters}
        filters={optimisticFilters}
        isPending={
          isNavigationPending ||
          (catalog.isFetching && !catalog.isFetchingNextPage)
        }
        onClearFilters={() => navigate("clear")}
        onFiltersChange={(patch) => navigate(patch)}
        onRemoveFilter={(key) => navigate({ [key]: undefined })}
        options={options}
        quickFilters={
          viewerRole === "COMPANY" ? (
            <div
              aria-label="Atalhos de descoberta"
              className="contents"
              role="group"
            >
              <Button
                aria-pressed={!filters.niche && !filters.platform}
                className={
                  !optimisticFilters.niche && !optimisticFilters.platform
                    ? "bg-brand-night min-h-11 shrink-0 rounded-full px-4 text-white hover:bg-black"
                    : "min-h-11 shrink-0 rounded-full bg-white px-4 shadow-sm"
                }
                onClick={() =>
                  navigate({ niche: undefined, platform: undefined })
                }
                size="sm"
                type="button"
                variant={
                  !optimisticFilters.niche && !optimisticFilters.platform
                    ? "default"
                    : "outline"
                }
              >
                Todos
              </Button>
              {companyDiscoveryShortcuts.map((shortcut) => {
                const active =
                  optimisticFilters[shortcut.key] === shortcut.value;

                return (
                  <Button
                    aria-pressed={active}
                    className={
                      active
                        ? "bg-brand-blue min-h-11 shrink-0 rounded-full border-transparent px-4 text-white"
                        : "min-h-11 shrink-0 rounded-full bg-white px-4 shadow-sm"
                    }
                    key={`${shortcut.key}-${shortcut.value}`}
                    onClick={() => {
                      if (shortcut.key === "niche") {
                        navigate({
                          niche: active ? undefined : shortcut.value,
                        });
                        return;
                      }

                      navigate({
                        platform: active
                          ? undefined
                          : (shortcut.value as CatalogSocialPlatform),
                      });
                    }}
                    size="sm"
                    type="button"
                    variant={active ? "default" : "outline"}
                  >
                    {shortcut.label}
                  </Button>
                );
              })}
            </div>
          ) : undefined
        }
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

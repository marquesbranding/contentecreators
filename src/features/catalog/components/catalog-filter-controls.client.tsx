"use client";

import { SlidersHorizontal, X } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldLabel } from "@/shared/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { SearchableSelect } from "@/shared/components/ui/searchable-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import { useHydrated } from "@/shared/hooks/use-hydrated";

import type {
  CatalogCreatorType,
  CatalogSocialPlatform,
  CreatorCatalogFilters,
} from "../types/creator-catalog.types";

export interface CatalogFilterOption {
  label: string;
  value: string;
}

export interface CatalogFilterOptions {
  cities: string[];
  niches: CatalogFilterOption[];
  states: string[];
}

export interface CatalogActiveFilter {
  key: Exclude<keyof CreatorCatalogFilters, "cursor" | "pageSize">;
  label: string;
}

interface CatalogFilterControlsProps {
  activeFilters: CatalogActiveFilter[];
  filters: CreatorCatalogFilters;
  isPending?: boolean;
  onClearFilters: () => void;
  onFiltersChange: (
    patch: Partial<Omit<CreatorCatalogFilters, "cursor">>,
  ) => void;
  onRemoveFilter: (key: CatalogActiveFilter["key"]) => void;
  options: CatalogFilterOptions;
  quickFilters?: ReactNode;
}

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

function FilterFields({
  filters,
  idPrefix,
  isPending,
  onFiltersChange,
  options,
}: Pick<
  CatalogFilterControlsProps,
  "filters" | "isPending" | "onFiltersChange" | "options"
> & {
  idPrefix: string;
}) {
  function update(patch: Partial<Omit<CreatorCatalogFilters, "cursor">>) {
    onFiltersChange(patch);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-creator-type`}>
          Tipo de criador
        </FieldLabel>
        <Select
          disabled={isPending}
          items={{
            ALL: "Todos os tipos",
            INFLUENCER: "Influenciador",
            UGC: "Criador UGC",
          }}
          onValueChange={(value) =>
            update({
              creatorType:
                value && value !== "ALL"
                  ? (value as CatalogCreatorType)
                  : undefined,
            })
          }
          value={filters.creatorType ?? "ALL"}
        >
          <SelectTrigger
            className="w-full"
            id={`${idPrefix}-creator-type`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os tipos</SelectItem>
            <SelectItem value="INFLUENCER">Influenciador</SelectItem>
            <SelectItem value="UGC">Criador UGC</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-niche`}>Nicho</FieldLabel>
        <SearchableSelect
          disabled={isPending}
          id={`${idPrefix}-niche`}
          items={Object.fromEntries([
            ["ALL", "Todos os nichos"],
            ...options.niches.map((option) => [option.value, option.label]),
          ])}
          onValueChange={(value) =>
            update({ niche: value && value !== "ALL" ? value : undefined })
          }
          value={filters.niche ?? "ALL"}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-platform`}>Rede social</FieldLabel>
        <SearchableSelect
          disabled={isPending}
          id={`${idPrefix}-platform`}
          items={{
            ALL: "Todas as redes",
            ...platformLabels,
          }}
          onValueChange={(value) =>
            update({
              platform:
                value && value !== "ALL"
                  ? (value as CatalogSocialPlatform)
                  : undefined,
            })
          }
          value={filters.platform ?? "ALL"}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-city`}>Cidade</FieldLabel>
        <SearchableSelect
          disabled={isPending}
          id={`${idPrefix}-city`}
          items={Object.fromEntries([
            ["ALL", "Todas as cidades"],
            ...options.cities.map((city) => [city, city]),
          ])}
          onValueChange={(value) =>
            update({ city: value && value !== "ALL" ? value : undefined })
          }
          value={filters.city ?? "ALL"}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-state`}>UF</FieldLabel>
        <SearchableSelect
          disabled={isPending}
          id={`${idPrefix}-state`}
          items={Object.fromEntries([
            ["ALL", "Todas as UFs"],
            ...options.states.map((state) => [state, state]),
          ])}
          onValueChange={(value) =>
            update({ state: value && value !== "ALL" ? value : undefined })
          }
          value={filters.state ?? "ALL"}
        />
      </Field>
    </div>
  );
}

function ActiveFilters({
  activeFilters,
  onClearFilters,
  onRemoveFilter,
}: Pick<
  CatalogFilterControlsProps,
  "activeFilters" | "onClearFilters" | "onRemoveFilter"
>) {
  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div
      aria-label="Filtros ativos"
      className="flex flex-wrap items-center gap-2"
      role="group"
    >
      {activeFilters.map((filter) => (
        <Badge
          className="h-11 gap-1.5 rounded-full pr-0 pl-4"
          key={filter.key}
          variant="secondary"
        >
          {filter.label}
          <button
            aria-label={`Remover filtro ${filter.label}`}
            className="focus-visible:ring-ring flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-2"
            onClick={() => onRemoveFilter(filter.key)}
            type="button"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        </Badge>
      ))}
      <Button
        aria-label="Limpar todos os filtros"
        onClick={onClearFilters}
        type="button"
        variant="ghost"
      >
        Limpar tudo
      </Button>
    </div>
  );
}

export function CatalogFilterControls({
  activeFilters,
  filters,
  isPending = false,
  onClearFilters,
  onFiltersChange,
  onRemoveFilter,
  options,
  quickFilters,
}: CatalogFilterControlsProps) {
  const hydrated = useHydrated();
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <section aria-label="Filtros do catálogo" className="space-y-3 pt-1">
      <div className="-mx-4 flex scroll-px-4 items-center gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <Sheet onOpenChange={setFiltersOpen} open={filtersOpen}>
          <SheetTrigger
            render={
              <Button
                aria-label="Abrir filtros do catálogo"
                className="min-h-11 shrink-0 gap-2 rounded-full bg-white px-4 shadow-sm"
                disabled={!hydrated || isPending}
                size="sm"
                type="button"
                variant="outline"
              />
            }
          >
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            Filtros
            {activeFilters.length > 0 ? (
              <Badge
                className="min-w-6 justify-center px-1.5"
                variant="default"
              >
                {activeFilters.length}
              </Badge>
            ) : null}
          </SheetTrigger>
          <SheetContent
            className="max-h-[88svh] overflow-y-auto sm:rounded-t-3xl"
            side="bottom"
          >
            <SheetHeader className="border-b">
              <SheetTitle>Filtrar criadores</SheetTitle>
              <SheetDescription>
                Combine os filtros para encontrar perfis alinhados à sua busca.
              </SheetDescription>
            </SheetHeader>
            <div className="px-5">
              <FilterFields
                filters={filters}
                idPrefix="mobile-catalog"
                isPending={isPending}
                onFiltersChange={onFiltersChange}
                options={options}
              />
            </div>
            <SheetFooter className="border-t">
              {activeFilters.length > 0 ? (
                <Button
                  onClick={onClearFilters}
                  type="button"
                  variant="outline"
                >
                  Limpar filtros
                </Button>
              ) : null}
              <Button
                onClick={() => setFiltersOpen(false)}
                size="lg"
                type="button"
              >
                Mostrar resultados
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        {quickFilters}
      </div>

      <ActiveFilters
        activeFilters={activeFilters}
        onClearFilters={onClearFilters}
        onRemoveFilter={onRemoveFilter}
      />

      {isPending ? (
        <p
          aria-live="polite"
          className="text-muted-foreground text-sm"
          role="status"
        >
          Atualizando resultados
        </p>
      ) : null}
    </section>
  );
}

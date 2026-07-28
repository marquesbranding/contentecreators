"use client";

import { Funnel, Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Field, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";

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
  onSearchSubmit: (search: string) => void;
  options: CatalogFilterOptions;
}

const platformLabels: Record<CatalogSocialPlatform, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  OTHER: "Outra rede",
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
            className="h-12 w-full"
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
        <Select
          disabled={isPending}
          items={Object.fromEntries([
            ["ALL", "Todos os nichos"],
            ...options.niches.map((option) => [option.value, option.label]),
          ])}
          onValueChange={(value) =>
            update({ niche: value && value !== "ALL" ? value : undefined })
          }
          value={filters.niche ?? "ALL"}
        >
          <SelectTrigger className="h-12 w-full" id={`${idPrefix}-niche`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os nichos</SelectItem>
            {options.niches.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-platform`}>Rede social</FieldLabel>
        <Select
          disabled={isPending}
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
        >
          <SelectTrigger className="h-12 w-full" id={`${idPrefix}-platform`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as redes</SelectItem>
            {Object.entries(platformLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-city`}>Cidade</FieldLabel>
        <Select
          disabled={isPending}
          items={Object.fromEntries([
            ["ALL", "Todas as cidades"],
            ...options.cities.map((city) => [city, city]),
          ])}
          onValueChange={(value) =>
            update({ city: value && value !== "ALL" ? value : undefined })
          }
          value={filters.city ?? "ALL"}
        >
          <SelectTrigger className="h-12 w-full" id={`${idPrefix}-city`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as cidades</SelectItem>
            {options.cities.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-state`}>UF</FieldLabel>
        <Select
          disabled={isPending}
          items={Object.fromEntries([
            ["ALL", "Todas as UFs"],
            ...options.states.map((state) => [state, state]),
          ])}
          onValueChange={(value) =>
            update({ state: value && value !== "ALL" ? value : undefined })
          }
          value={filters.state ?? "ALL"}
        >
          <SelectTrigger className="h-12 w-full" id={`${idPrefix}-state`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as UFs</SelectItem>
            {options.states.map((state) => (
              <SelectItem key={state} value={state}>
                {state}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
  onSearchSubmit,
  options,
}: CatalogFilterControlsProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  return (
    <section aria-label="Busca e filtros do catálogo" className="space-y-4">
      <form
        className="flex flex-col gap-3 sm:flex-row"
        key={filters.search ?? ""}
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          onSearchSubmit(String(formData.get("search") ?? "").trim());
        }}
        role="search"
      >
        <Field className="flex-1">
          <FieldLabel className="sr-only" htmlFor="catalog-search">
            Buscar criadores
          </FieldLabel>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
            />
            <Input
              className="h-12 rounded-xl bg-white pr-4 pl-12"
              disabled={isPending}
              defaultValue={filters.search ?? ""}
              id="catalog-search"
              name="search"
              placeholder="Busque pelo nome do criador"
              type="search"
            />
          </div>
        </Field>
        <Button disabled={isPending} size="lg" type="submit">
          <Search aria-hidden="true" />
          Buscar
        </Button>
      </form>

      <div className="md:hidden">
        <Sheet onOpenChange={setMobileFiltersOpen} open={mobileFiltersOpen}>
          <SheetTrigger
            render={
              <Button
                aria-label="Abrir filtros do catálogo"
                className="w-full justify-between"
                size="lg"
                type="button"
                variant="outline"
              />
            }
          >
            <span className="flex items-center gap-2">
              <Funnel aria-hidden="true" />
              Filtros
            </span>
            {activeFilters.length > 0 ? (
              <Badge variant="default">{activeFilters.length}</Badge>
            ) : null}
          </SheetTrigger>
          <SheetContent className="overflow-y-auto" side="bottom">
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
                onClick={() => setMobileFiltersOpen(false)}
                size="lg"
                type="button"
              >
                Mostrar resultados
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <Card className="hidden rounded-2xl border bg-white shadow-sm md:flex">
        <CardContent className="px-5 py-1">
          <div className="mb-4 flex items-center gap-2">
            <SlidersHorizontal
              aria-hidden="true"
              className="text-brand-blue size-5"
            />
            <h2 className="font-semibold">Refine sua busca</h2>
          </div>
          <FilterFields
            filters={filters}
            idPrefix="desktop-catalog"
            isPending={isPending}
            onFiltersChange={onFiltersChange}
            options={options}
          />
        </CardContent>
      </Card>

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

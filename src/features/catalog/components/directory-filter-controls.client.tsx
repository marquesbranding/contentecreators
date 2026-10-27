"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Field, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { SearchableSelect } from "@/shared/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { accountTypeLabels } from "@/shared/domain/account-type-labels";
import { useDebouncedCallback } from "@/shared/hooks/use-debounced-callback";
import { useHydrated } from "@/shared/hooks/use-hydrated";

import type {
  CatalogSocialPlatform,
  CatalogNicheDto,
} from "../types/creator-catalog.types";
import type {
  DirectoryFilters,
  DirectoryTypeFilter,
} from "../types/catalog-directory.types";

/**
 * Numeric filter that keeps typing local and only commits to the URL once the
 * user stopped typing, so each digit does not navigate (and does not lock the
 * field while the navigation is pending).
 */
function FollowersInput({
  id,
  onCommit,
  placeholder,
  value,
}: {
  id: string;
  onCommit: (value: number | undefined) => void;
  placeholder: string;
  value: number | undefined;
}) {
  const [localValue, setLocalValue] = useState(value?.toString() ?? "");
  const [syncedValue, setSyncedValue] = useState(value);
  const debouncedCommit = useDebouncedCallback(onCommit);

  if (value !== syncedValue) {
    setSyncedValue(value);
    setLocalValue(value?.toString() ?? "");
  }

  return (
    <Input
      id={id}
      inputMode="numeric"
      min={0}
      onBlur={() => debouncedCommit.flush()}
      onChange={(event) => {
        setLocalValue(event.target.value);
        debouncedCommit.run(
          event.target.value ? Number(event.target.value) : undefined,
        );
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          debouncedCommit.flush();
        }
      }}
      placeholder={placeholder}
      type="number"
      value={localValue}
    />
  );
}

export interface DirectoryFilterOptions {
  cities: string[];
  niches: CatalogNicheDto[];
  segments: string[];
  states: string[];
}

export type DirectoryActiveFilterKey = Exclude<
  keyof DirectoryFilters,
  "cursor" | "pageSize"
>;

export interface DirectoryActiveFilter {
  key: DirectoryActiveFilterKey;
  label: string;
  value?: string;
}

interface DirectoryFilterControlsProps {
  activeFilters: DirectoryActiveFilter[];
  filters: DirectoryFilters;
  isPending?: boolean;
  onClearFilters: () => void;
  onFiltersChange: (patch: Partial<Omit<DirectoryFilters, "cursor">>) => void;
  onRemoveFilter: (key: DirectoryActiveFilterKey, value?: string) => void;
  options: DirectoryFilterOptions;
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

const typeCheckboxes: { label: string; value: DirectoryTypeFilter }[] = [
  { label: accountTypeLabels.COMPANY, value: "COMPANY" },
  { label: accountTypeLabels.INFLUENCER, value: "INFLUENCER" },
  { label: accountTypeLabels.UGC, value: "UGC" },
];

function FilterFields({
  filters,
  isPending,
  onFiltersChange,
  options,
}: Pick<
  DirectoryFilterControlsProps,
  "filters" | "isPending" | "onFiltersChange" | "options"
>) {
  function update(patch: Partial<Omit<DirectoryFilters, "cursor">>) {
    onFiltersChange(patch);
  }

  const selectedTypes = new Set(filters.type ?? []);

  function toggleType(value: DirectoryTypeFilter, checked: boolean) {
    const next = new Set(selectedTypes);

    if (checked) {
      next.add(value);
    } else {
      next.delete(value);
    }

    update({ type: next.size > 0 ? [...next] : undefined });
  }

  return (
    <div className="space-y-6">
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium">Tipo</legend>
        <div className="flex flex-wrap gap-4">
          {typeCheckboxes.map((option) => (
            <label
              className="flex items-center gap-2 text-sm"
              key={option.value}
            >
              <Checkbox
                checked={selectedTypes.has(option.value)}
                disabled={isPending}
                onCheckedChange={(checked) =>
                  toggleType(option.value, Boolean(checked))
                }
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium">Selos</legend>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={Boolean(filters.cdl)}
              disabled={isPending}
              onCheckedChange={(checked) =>
                update({ cdl: checked ? true : undefined })
              }
            />
            Associado da CDL
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={Boolean(filters.jornada)}
              disabled={isPending}
              onCheckedChange={(checked) =>
                update({ jornada: checked ? true : undefined })
              }
            />
            Fez a Jornada do Influenciador
          </label>
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="directory-filter-city">Cidade</FieldLabel>
          <SearchableSelect
            disabled={isPending}
            id="directory-filter-city"
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
          <FieldLabel htmlFor="directory-filter-state">UF</FieldLabel>
          <SearchableSelect
            disabled={isPending}
            id="directory-filter-state"
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
        <Field>
          <FieldLabel htmlFor="directory-filter-niche">Nicho</FieldLabel>
          <SearchableSelect
            disabled={isPending}
            id="directory-filter-niche"
            items={Object.fromEntries([
              ["ALL", "Todos os nichos"],
              ...options.niches.map((niche) => [niche.slug, niche.name]),
            ])}
            onValueChange={(value) =>
              update({ niche: value && value !== "ALL" ? value : undefined })
            }
            value={filters.niche ?? "ALL"}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="directory-filter-segment">Segmento</FieldLabel>
          <SearchableSelect
            disabled={isPending}
            id="directory-filter-segment"
            items={Object.fromEntries([
              ["ALL", "Todos os segmentos"],
              ...options.segments.map((segment) => [segment, segment]),
            ])}
            onValueChange={(value) =>
              update({
                segment: value && value !== "ALL" ? value : undefined,
              })
            }
            value={filters.segment ?? "ALL"}
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="directory-filter-platform">Rede social</FieldLabel>
        <Select
          disabled={isPending}
          items={{ ALL: "Todas as redes", ...platformLabels }}
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
          <SelectTrigger className="w-full" id="directory-filter-platform">
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

      {filters.platform === "INSTAGRAM" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="directory-filter-followers-min">
              Seguidores (mínimo)
            </FieldLabel>
            <FollowersInput
              id="directory-filter-followers-min"
              onCommit={(followersMin) => update({ followersMin })}
              placeholder="0"
              value={filters.followersMin}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="directory-filter-followers-max">
              Seguidores (máximo)
            </FieldLabel>
            <FollowersInput
              id="directory-filter-followers-max"
              onCommit={(followersMax) => update({ followersMax })}
              placeholder="Sem limite"
              value={filters.followersMax}
            />
          </Field>
        </div>
      ) : null}
    </div>
  );
}

function ActiveFilters({
  activeFilters,
  onRemoveFilter,
}: Pick<DirectoryFilterControlsProps, "activeFilters" | "onRemoveFilter">) {
  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div aria-label="Filtros ativos" className="contents" role="group">
      {activeFilters.map((filter) => (
        <Badge
          className="h-11 gap-1 rounded-full pr-0 pl-4 lg:h-9 lg:pl-3"
          key={`${filter.key}-${filter.value ?? ""}`}
          variant="secondary"
        >
          {filter.label}
          <button
            aria-label={`Remover filtro ${filter.label}`}
            className="focus-visible:ring-ring flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-2 lg:size-9"
            onClick={() => onRemoveFilter(filter.key, filter.value)}
            type="button"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        </Badge>
      ))}
    </div>
  );
}

export function DirectoryFilterControls({
  activeFilters,
  filters,
  isPending = false,
  onClearFilters,
  onFiltersChange,
  onRemoveFilter,
  options,
}: DirectoryFilterControlsProps) {
  const hydrated = useHydrated();
  const [filtersOpen, setFiltersOpen] = useState(false);

  // `contents`: the button and the badges become items of the parent's wrapping
  // row, so badges flow after the button and never push it or the search.
  return (
    <section aria-label="Filtros do catálogo" className="contents">
      <Dialog onOpenChange={setFiltersOpen} open={filtersOpen}>
        <DialogTrigger
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
            <Badge className="min-w-6 justify-center px-1.5" variant="default">
              {activeFilters.length}
            </Badge>
          ) : null}
        </DialogTrigger>
        <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Filtrar catálogo</DialogTitle>
            <DialogDescription>
              Combine os filtros para encontrar empresas e criadores alinhados à
              sua busca.
            </DialogDescription>
          </DialogHeader>
          <FilterFields
            filters={filters}
            isPending={isPending}
            onFiltersChange={onFiltersChange}
            options={options}
          />
          <DialogFooter>
            {activeFilters.length > 0 ? (
              <Button onClick={onClearFilters} type="button" variant="outline">
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ActiveFilters
        activeFilters={activeFilters}
        onRemoveFilter={onRemoveFilter}
      />

      {isPending ? (
        <p
          aria-live="polite"
          className="text-muted-foreground basis-full text-sm"
          role="status"
        >
          Atualizando resultados
        </p>
      ) : null}
    </section>
  );
}

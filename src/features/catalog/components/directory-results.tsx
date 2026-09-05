"use client";

import {
  AlertCircle,
  LoaderCircle,
  RotateCcw,
  SearchX,
  UsersRound,
} from "lucide-react";
import { Fragment, type ReactNode } from "react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/cn";

import type { DirectoryBrowserEntryDto } from "../api/catalog-directory.contract";
import { CatalogEmptyState } from "./catalog-empty-state";
import { DirectoryEntryCard } from "./directory-entry-card";
import { staggerItemClassName } from "../lib/stagger";

export type DirectoryResultsStatus = "error" | "loading" | "success";

interface DirectoryResultsProps {
  hasActiveFilters?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  items: DirectoryBrowserEntryDto[];
  midlistSlots?: ReactNode[];
  onClearFilters?: () => void;
  onLoadMore?: () => void;
  onRetry?: () => void;
  status: DirectoryResultsStatus;
}

const ENTRIES_BEFORE_MIDLIST = 8;

function chunkItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }

  return chunks;
}

export function DirectoryLoadingSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div aria-live="polite" className="space-y-4" role="status">
      <span className="sr-only">Carregando catálogo</span>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: count }, (_, index) => (
          <Card
            aria-hidden="true"
            className="gap-4 rounded-2xl border bg-white p-0"
            key={index}
          >
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <CardContent className="space-y-3 px-5 pb-5">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DirectoryError({ onRetry }: Pick<DirectoryResultsProps, "onRetry">) {
  return (
    <Alert
      aria-live="assertive"
      className="border-destructive/30 rounded-2xl bg-white p-5"
      variant="destructive"
    >
      <AlertCircle aria-hidden="true" className="size-5" />
      <AlertTitle>Não foi possível carregar o catálogo</AlertTitle>
      <AlertDescription>
        Os resultados anteriores foram removidos para proteger os dados. Tente
        novamente e confirme se sua sessão continua ativa.
      </AlertDescription>
      <Button
        className="mt-4 w-fit"
        onClick={onRetry}
        size="lg"
        type="button"
        variant="outline"
      >
        <RotateCcw aria-hidden="true" />
        Tentar novamente
      </Button>
    </Alert>
  );
}

export function DirectoryResults({
  hasActiveFilters = false,
  hasNextPage = false,
  isFetchingNextPage = false,
  items,
  midlistSlots = [],
  onClearFilters,
  onLoadMore,
  onRetry,
  status,
}: DirectoryResultsProps) {
  if (status === "loading") {
    return <DirectoryLoadingSkeleton />;
  }

  if (status === "error") {
    return <DirectoryError onRetry={onRetry} />;
  }

  if (items.length === 0) {
    return hasActiveFilters ? (
      <CatalogEmptyState
        actions={
          <Button
            onClick={onClearFilters}
            size="lg"
            type="button"
            variant="outline"
          >
            Limpar filtros
          </Button>
        }
        description="Remova um filtro ou amplie a busca por cidade/UF."
        icon={SearchX}
        title="Nenhum perfil com esses filtros"
        tone="filtered"
      />
    ) : (
      <CatalogEmptyState
        description="Cadastros em análise não aparecem na busca. Assim que a equipe aprovar o primeiro perfil, ele será exibido aqui automaticamente."
        icon={UsersRound}
        title="Ainda não há perfis aprovados"
        tone="first"
      />
    );
  }

  const hasMidlist = midlistSlots.length > 0;
  const itemChunks = hasMidlist
    ? chunkItems(items, ENTRIES_BEFORE_MIDLIST)
    : [items];

  return (
    <section aria-label="Catálogo" className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-foreground text-2xl font-bold tracking-[-0.03em]">
          Empresas e criadores
        </h2>
        <p aria-live="polite" className="text-muted-foreground text-sm">
          {items.length}{" "}
          {items.length === 1 ? "perfil nesta página" : "perfis nesta página"}
        </p>
      </div>

      {itemChunks.map((chunkOfItems, chunkIndex) => (
        <Fragment key={chunkIndex}>
          <ul
            aria-label={
              chunkIndex === 0
                ? "Lista do catálogo"
                : "Lista do catálogo, continuação"
            }
            className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {chunkOfItems.map((entry, index) => (
              <li
                className={cn("h-full min-w-0", staggerItemClassName(index))}
                key={
                  entry.kind === "COMPANY" ? entry.companyId : entry.creatorId
                }
              >
                <DirectoryEntryCard entry={entry} />
              </li>
            ))}
          </ul>

          {chunkIndex < itemChunks.length - 1
            ? midlistSlots[chunkIndex % midlistSlots.length]
            : null}
        </Fragment>
      ))}

      {hasNextPage ? (
        <div className="flex flex-col items-center gap-2 pt-2">
          <Button
            aria-label={
              isFetchingNextPage ? "Carregando mais" : "Carregar mais"
            }
            disabled={isFetchingNextPage}
            onClick={onLoadMore}
            size="lg"
            type="button"
            variant="outline"
          >
            {isFetchingNextPage ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : null}
            {isFetchingNextPage ? "Carregando mais" : "Carregar mais"}
          </Button>
          {isFetchingNextPage ? (
            <p
              aria-live="polite"
              className="text-muted-foreground text-sm"
              role="status"
            >
              Carregando mais perfis
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

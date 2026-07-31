"use client";

import {
  AlertCircle,
  LoaderCircle,
  RotateCcw,
  SearchX,
  UsersRound,
} from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

import {
  CatalogCreatorCard,
  type CatalogCreatorCardViewModel,
} from "./catalog-creator-card";

export type CatalogResultsStatus = "error" | "loading" | "success";

interface CatalogResultsProps {
  hasActiveFilters?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  items: CatalogCreatorCardViewModel[];
  onClearFilters?: () => void;
  onLoadMore?: () => void;
  onRetry?: () => void;
  status: CatalogResultsStatus;
}

export function CatalogLoadingSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div aria-live="polite" className="space-y-4" role="status">
      <span className="sr-only">Carregando criadores</span>
      <Skeleton className="h-5 w-44" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
              <Skeleton className="h-12 w-full rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CatalogError({ onRetry }: Pick<CatalogResultsProps, "onRetry">) {
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

function FirstCatalogEmpty() {
  return (
    <Card className="bg-brand-night items-center rounded-3xl border-white/10 px-5 py-14 text-center text-white shadow-lg">
      <span className="bg-brand-blue/20 text-brand-blue flex size-14 items-center justify-center rounded-2xl">
        <UsersRound aria-hidden="true" className="size-7" />
      </span>
      <CardTitle>
        <h2 className="text-xl font-bold">Ainda não há creators aprovados</h2>
      </CardTitle>
      <p className="max-w-lg leading-6 text-white/60">
        Cadastros em análise não aparecem na busca. Assim que a equipe aprovar o
        primeiro perfil, ele será exibido aqui automaticamente.
      </p>
    </Card>
  );
}

function FilteredCatalogEmpty({
  onClearFilters,
}: Pick<CatalogResultsProps, "onClearFilters">) {
  return (
    <Card className="items-center rounded-2xl border bg-white px-5 py-12 text-center shadow-sm">
      <SearchX aria-hidden="true" className="text-brand-blue size-10" />
      <CardTitle>
        <h2 className="text-xl font-bold">Nenhum criador encontrado</h2>
      </CardTitle>
      <p className="text-muted-foreground max-w-lg leading-6">
        Tente ampliar a busca removendo um ou mais filtros ativos.
      </p>
      <Button
        className="mt-2"
        onClick={onClearFilters}
        size="lg"
        type="button"
        variant="outline"
      >
        Limpar filtros
      </Button>
    </Card>
  );
}

export function CatalogResults({
  hasActiveFilters = false,
  hasNextPage = false,
  isFetchingNextPage = false,
  items,
  onClearFilters,
  onLoadMore,
  onRetry,
  status,
}: CatalogResultsProps) {
  if (status === "loading") {
    return <CatalogLoadingSkeleton />;
  }

  if (status === "error") {
    return <CatalogError onRetry={onRetry} />;
  }

  if (items.length === 0) {
    return hasActiveFilters ? (
      <FilteredCatalogEmpty onClearFilters={onClearFilters} />
    ) : (
      <FirstCatalogEmpty />
    );
  }

  return (
    <section
      aria-label="Criadores encontrados"
      className="bg-brand-night space-y-5 rounded-3xl border border-white/10 px-4 py-6 shadow-xl sm:px-6 sm:py-7"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-brand-lime text-xs font-bold tracking-[0.16em] uppercase">
            Seleção aprovada
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-white">
            Creators para conhecer
          </h2>
        </div>
        <p aria-live="polite" className="text-sm text-white/55">
          {items.length}{" "}
          {items.length === 1
            ? "creator nesta página"
            : "creators nesta página"}
        </p>
      </div>

      <ul
        aria-label="Lista de criadores"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        {items.map((creator) => (
          <li className="min-w-0" key={creator.creatorId}>
            <CatalogCreatorCard creator={creator} />
          </li>
        ))}
      </ul>

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
              Carregando mais criadores
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

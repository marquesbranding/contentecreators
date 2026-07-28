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
    <Card className="items-center rounded-2xl border bg-white px-5 py-12 text-center shadow-sm">
      <UsersRound aria-hidden="true" className="text-brand-blue size-10" />
      <CardTitle>
        <h2 className="text-xl font-bold">O catálogo está começando</h2>
      </CardTitle>
      <p className="text-muted-foreground max-w-lg leading-6">
        Novos perfis aprovados aparecerão aqui. Volte em breve para descobrir
        criadores disponíveis na plataforma.
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
    <section aria-label="Criadores encontrados" className="space-y-5">
      <p aria-live="polite" className="text-muted-foreground text-sm">
        {items.length}{" "}
        {items.length === 1 ? "criador nesta página" : "criadores nesta página"}
      </p>

      <ul
        aria-label="Lista de criadores"
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
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

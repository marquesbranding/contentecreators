"use client";

import { AlertCircle, Building2, RotateCcw, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Field, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { useModerationQueue } from "../hooks/use-moderation-queue";
import { serializeModerationQueueFilters } from "../schemas/moderation-queue.schema";
import type {
  ModerationQueueFilters,
  ModerationQueueOrder,
  ModerationQueueResponseDto,
  ModerationQueueStatus,
} from "../types/moderation-queue.types";
import { ModerationQueueResults } from "./moderation-queue-results";

type QueueViewQuery =
  | {
      data?: undefined;
      retry?: () => void;
      status: "error" | "loading";
    }
  | {
      data: ModerationQueueResponseDto;
      retry?: () => void;
      status: "success";
    };

function QueueCountCards({ data }: { data: ModerationQueueResponseDto }) {
  return (
    <section
      aria-label="Resumo das filas"
      className="grid gap-3 sm:grid-cols-2"
    >
      <Card size="sm">
        <CardHeader>
          <Users aria-hidden="true" className="text-brand-blue size-5" />
          <CardTitle>{data.counts.byRole.INFLUENCER} influenciadores</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Cadastros acionáveis na fila de criadores.
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <Building2 aria-hidden="true" className="text-brand-blue size-5" />
          <CardTitle>{data.counts.byRole.COMPANY} empresas</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Cadastros acionáveis na fila de empresas.
        </CardContent>
      </Card>
    </section>
  );
}

function QueueLoading() {
  return (
    <div aria-live="polite" className="space-y-3" role="status">
      <span className="sr-only">Carregando fila de moderação</span>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function QueueError({ retry }: { retry?: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertCircle aria-hidden="true" />
      <AlertTitle>Não foi possível carregar a fila</AlertTitle>
      <AlertDescription>
        Tente novamente. Se o problema continuar, confirme se sua sessão
        administrativa ainda está ativa.
      </AlertDescription>
      <Button
        className="mt-3 w-fit"
        onClick={() => retry?.()}
        size="sm"
        type="button"
        variant="outline"
      >
        <RotateCcw aria-hidden="true" />
        Tentar novamente
      </Button>
    </Alert>
  );
}

export function ModerationQueueView({
  filters,
  onFiltersChange,
  query,
}: {
  filters: ModerationQueueFilters;
  onFiltersChange: (filters: ModerationQueueFilters) => void;
  query: QueueViewQuery;
}) {
  const [search, setSearch] = useState(filters.search);

  function update(
    patch: Partial<ModerationQueueFilters>,
    { keepPage = false }: { keepPage?: boolean } = {},
  ) {
    onFiltersChange({
      ...filters,
      ...patch,
      page: keepPage ? (patch.page ?? filters.page) : 1,
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-brand-blue text-sm font-bold">Análise manual</p>
        <h1 className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
          Moderação de cadastros
        </h1>
        <p className="text-muted-foreground max-w-2xl leading-7">
          Localize uma submissão, revise os dados completos e registre cada
          decisão individualmente.
        </p>
      </div>

      <QueueCountCards
        data={
          query.data ?? {
            counts: {
              byRole: { COMPANY: 0, INFLUENCER: 0 },
              byStatus: {
                APPROVED: 0,
                BANNED: 0,
                CHANGES_REQUESTED: 0,
                PENDING_REVIEW: 0,
                SUSPENDED: 0,
              },
            },
            items: [],
            pagination: {
              page: filters.page,
              pageSize: filters.pageSize,
              totalItems: 0,
              totalPages: 0,
            },
          }
        }
      />

      <Card>
        <CardContent className="grid gap-5 pt-1">
          <div
            aria-label="Tipo de cadastro"
            className="grid grid-cols-2 gap-2"
            role="group"
          >
            <Button
              aria-pressed={filters.role === "INFLUENCER"}
              onClick={() => update({ role: "INFLUENCER" })}
              type="button"
              variant={filters.role === "INFLUENCER" ? "default" : "outline"}
            >
              <Users aria-hidden="true" />
              Influenciadores
            </Button>
            <Button
              aria-pressed={filters.role === "COMPANY"}
              onClick={() => update({ role: "COMPANY" })}
              type="button"
              variant={filters.role === "COMPANY" ? "default" : "outline"}
            >
              <Building2 aria-hidden="true" />
              Empresas
            </Button>
          </div>

          <form
            className="grid gap-4 lg:grid-cols-[minmax(14rem,1fr)_14rem_14rem_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              update({ search: search.trim() });
            }}
            role="search"
          >
            <Field>
              <FieldLabel htmlFor="moderation-search">
                Buscar cadastro
              </FieldLabel>
              <Input
                id="moderation-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome do cadastro"
                type="search"
                value={search}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="moderation-status">Status</FieldLabel>
              <Select
                items={{
                  ALL: "Todos os status",
                  APPROVED: "Aprovado",
                  BANNED: "Banido",
                  CHANGES_REQUESTED: "Correções solicitadas",
                  PENDING_REVIEW: "Aguardando análise",
                  SUSPENDED: "Suspenso",
                }}
                onValueChange={(value) =>
                  update({
                    status:
                      value && value !== "ALL"
                        ? (value as ModerationQueueStatus)
                        : undefined,
                  })
                }
                value={filters.status ?? "ALL"}
              >
                <SelectTrigger className="h-11 w-full" id="moderation-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os status</SelectItem>
                  <SelectItem value="PENDING_REVIEW">
                    Aguardando análise
                  </SelectItem>
                  <SelectItem value="CHANGES_REQUESTED">
                    Correções solicitadas
                  </SelectItem>
                  <SelectItem value="APPROVED">Aprovado</SelectItem>
                  <SelectItem value="SUSPENDED">Suspenso</SelectItem>
                  <SelectItem value="BANNED">Banido</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="moderation-order">Ordenação</FieldLabel>
              <Select
                items={{
                  NAME_ASC: "Nome (A–Z)",
                  NEWEST_SUBMITTED: "Envios mais recentes",
                  OLDEST_SUBMITTED: "Envios mais antigos",
                  PENDING_FIRST: "Pendências primeiro",
                }}
                onValueChange={(value) =>
                  value && update({ order: value as ModerationQueueOrder })
                }
                value={filters.order}
              >
                <SelectTrigger className="h-11 w-full" id="moderation-order">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING_FIRST">
                    Pendências primeiro
                  </SelectItem>
                  <SelectItem value="OLDEST_SUBMITTED">
                    Envios mais antigos
                  </SelectItem>
                  <SelectItem value="NEWEST_SUBMITTED">
                    Envios mais recentes
                  </SelectItem>
                  <SelectItem value="NAME_ASC">Nome (A–Z)</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Button className="self-end" type="submit">
              <Search aria-hidden="true" />
              Buscar
            </Button>
          </form>
        </CardContent>
      </Card>

      {query.status === "loading" ? <QueueLoading /> : null}
      {query.status === "error" ? <QueueError retry={query.retry} /> : null}
      {query.status === "success" ? (
        <ModerationQueueResults
          onPageChange={(page) => update({ page }, { keepPage: true })}
          response={query.data}
        />
      ) : null}
    </div>
  );
}

export function ModerationQueueScreen({
  filters,
}: {
  filters: ModerationQueueFilters;
}) {
  const router = useRouter();
  const query = useModerationQueue(filters);

  return (
    <ModerationQueueView
      filters={filters}
      onFiltersChange={(nextFilters) => {
        router.replace(
          `/backoffice/moderation?${serializeModerationQueueFilters(nextFilters).toString()}`,
          { scroll: false },
        );
      }}
      query={
        query.isPending
          ? { status: "loading" }
          : query.isError
            ? { retry: () => void query.refetch(), status: "error" }
            : { data: query.data, status: "success" }
      }
    />
  );
}

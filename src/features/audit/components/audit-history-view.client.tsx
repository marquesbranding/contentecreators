"use client";

import {
  AlertCircle,
  Eraser,
  Filter,
  History,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Field, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { SearchableSelect } from "@/shared/components/ui/searchable-select";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { useAuditHistory } from "../hooks/use-audit-history";
import { serializeAuditHistoryFilters } from "../schemas/audit-history.schema";
import type {
  AuditHistoryFilters,
  AuditHistoryResponseDto,
} from "../types/audit-history.types";
import type {
  AuditActorType,
  AuditOperation,
  AuditSource,
} from "../types/audit-types";
import { AuditHistoryResults } from "./audit-history-results";

type AuditHistoryViewQuery =
  | {
      data?: undefined;
      retry?: () => void;
      status: "error" | "loading";
    }
  | {
      data: AuditHistoryResponseDto;
      retry?: () => void;
      status: "success";
    };

type FilterDraft = {
  action: AuditOperation | "ALL";
  actorAccountId: string;
  actorType: AuditActorType | "ALL";
  entity: string;
  periodFrom: string;
  periodTo: string;
  record: string;
  source: AuditSource | "ALL";
};

function draftFromFilters(filters: AuditHistoryFilters): FilterDraft {
  return {
    action: filters.action ?? "ALL",
    actorAccountId: filters.actorAccountId ?? "",
    actorType: filters.actorType ?? "ALL",
    entity: filters.entity ?? "",
    periodFrom: filters.periodFrom ?? "",
    periodTo: filters.periodTo ?? "",
    record: filters.record ?? "",
    source: filters.source ?? "ALL",
  };
}

function AuditHistoryLoading() {
  return (
    <div aria-live="polite" className="space-y-3" role="status">
      <span className="sr-only">Carregando histórico de auditoria</span>
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function AuditHistoryError({ retry }: { retry?: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertCircle aria-hidden="true" />
      <AlertTitle>Não foi possível carregar a auditoria</AlertTitle>
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

export function AuditHistoryView({
  filters,
  onFiltersChange,
  query,
}: {
  filters: AuditHistoryFilters;
  onFiltersChange: (filters: AuditHistoryFilters) => void;
  query: AuditHistoryViewQuery;
}) {
  const [draft, setDraft] = useState(() => draftFromFilters(filters));

  function updateDraft<Key extends keyof FilterDraft>(
    key: Key,
    value: FilterDraft[Key],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function submitFilters() {
    onFiltersChange({
      action: draft.action === "ALL" ? undefined : draft.action,
      actorAccountId: draft.actorAccountId.trim() || undefined,
      actorType: draft.actorType === "ALL" ? undefined : draft.actorType,
      entity: draft.entity.trim() || undefined,
      page: 1,
      pageSize: filters.pageSize,
      periodFrom: draft.periodFrom || undefined,
      periodTo: draft.periodTo || undefined,
      record: draft.record.trim() || undefined,
      source: draft.source === "ALL" ? undefined : draft.source,
    });
  }

  function clearFilters() {
    setDraft(draftFromFilters({ page: 1, pageSize: filters.pageSize }));
    onFiltersChange({ page: 1, pageSize: filters.pageSize });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-brand-blue flex items-center gap-2 text-sm font-bold">
          <History aria-hidden="true" className="size-4" />
          Rastreabilidade operacional
        </p>
        <h1 className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
          Histórico de auditoria
        </h1>
        <p className="text-muted-foreground max-w-3xl leading-7">
          Consulte revisões imutáveis e compare somente os campos alterados.
          Dados sigilosos permanecem protegidos na apresentação.
        </p>
      </div>

      <Alert>
        <ShieldCheck aria-hidden="true" />
        <AlertTitle>Histórico somente para consulta</AlertTitle>
        <AlertDescription>
          Registros de auditoria não podem ser editados ou excluídos pelo
          backoffice.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-1">
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              submitFilters();
            }}
            role="search"
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="audit-entity">Entidade</FieldLabel>
                <Input
                  autoComplete="off"
                  id="audit-entity"
                  onChange={(event) =>
                    updateDraft("entity", event.target.value)
                  }
                  pattern="[a-z][a-z0-9_]*"
                  placeholder="Ex.: accounts"
                  title="Use somente letras minúsculas, números e sublinhado."
                  value={draft.entity}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="audit-record">ID do registro</FieldLabel>
                <Input
                  autoComplete="off"
                  id="audit-record"
                  onChange={(event) =>
                    updateDraft("record", event.target.value)
                  }
                  maxLength={200}
                  placeholder="UUID ou identificador"
                  value={draft.record}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="audit-actor-account">
                  ID da conta do ator
                </FieldLabel>
                <Input
                  autoComplete="off"
                  id="audit-actor-account"
                  onChange={(event) =>
                    updateDraft("actorAccountId", event.target.value)
                  }
                  pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}"
                  placeholder="UUID da conta"
                  title="Informe um UUID válido."
                  value={draft.actorAccountId}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="audit-actor-type">Tipo de ator</FieldLabel>
                <SearchableSelect
                  id="audit-actor-type"
                  items={{
                    ALL: "Todos os tipos",
                    ADMIN: "Administrador",
                    USER: "Usuário",
                    SYSTEM: "Sistema",
                    SYSTEM_UNKNOWN: "Sistema não identificado",
                  }}
                  onValueChange={(value) =>
                    value &&
                    updateDraft("actorType", value as FilterDraft["actorType"])
                  }
                  value={draft.actorType}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="audit-action">Ação</FieldLabel>
                <SearchableSelect
                  id="audit-action"
                  items={{
                    ALL: "Todas as ações",
                    INSERT: "Inclusão",
                    UPDATE: "Atualização",
                    ARCHIVE: "Arquivamento",
                    RESTORE: "Restauração",
                    DELETE: "Exclusão",
                    PRIVILEGED_READ: "Leitura privilegiada",
                  }}
                  onValueChange={(value) =>
                    value &&
                    updateDraft("action", value as FilterDraft["action"])
                  }
                  value={draft.action}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="audit-source">Origem</FieldLabel>
                <SearchableSelect
                  id="audit-source"
                  items={{
                    ALL: "Todas as origens",
                    APPLICATION: "Aplicação",
                    BACKOFFICE: "Backoffice",
                    AUTH_HOOK: "Hook de autenticação",
                    CRON: "Rotina agendada",
                    SCRIPT: "Script operacional",
                    DATABASE: "Banco de dados",
                  }}
                  onValueChange={(value) =>
                    value &&
                    updateDraft("source", value as FilterDraft["source"])
                  }
                  value={draft.source}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="audit-period-from">
                  Data inicial
                </FieldLabel>
                <Input
                  id="audit-period-from"
                  max={draft.periodTo || undefined}
                  onChange={(event) =>
                    updateDraft("periodFrom", event.target.value)
                  }
                  type="date"
                  value={draft.periodFrom}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="audit-period-to">Data final</FieldLabel>
                <Input
                  id="audit-period-to"
                  min={draft.periodFrom || undefined}
                  onChange={(event) =>
                    updateDraft("periodTo", event.target.value)
                  }
                  type="date"
                  value={draft.periodTo}
                />
              </Field>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button onClick={clearFilters} type="button" variant="outline">
                <Eraser aria-hidden="true" />
                Limpar filtros
              </Button>
              <Button type="submit">
                <Filter aria-hidden="true" />
                Aplicar filtros
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {query.status === "loading" ? <AuditHistoryLoading /> : null}
      {query.status === "error" ? (
        <AuditHistoryError retry={query.retry} />
      ) : null}
      {query.status === "success" ? (
        <AuditHistoryResults
          onPageChange={(page) =>
            onFiltersChange({
              ...filters,
              page,
            })
          }
          response={query.data}
        />
      ) : null}
    </div>
  );
}

export function AuditHistoryScreen({
  filters,
}: {
  filters: AuditHistoryFilters;
}) {
  const router = useRouter();
  const query = useAuditHistory(filters);
  const serializedFilters = serializeAuditHistoryFilters(filters).toString();

  return (
    <AuditHistoryView
      filters={filters}
      key={serializedFilters}
      onFiltersChange={(nextFilters) => {
        router.replace(
          `/backoffice/audit?${serializeAuditHistoryFilters(nextFilters).toString()}`,
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

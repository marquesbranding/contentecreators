"use client";

import { ArrowLeft, ArrowRight, FileClock, LockKeyhole } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

import {
  getAuditActionLabel,
  getAuditActorTypeLabel,
  getAuditEntityLabel,
  getAuditFieldLabel,
  getAuditSourceLabel,
  getAuditValueLabel,
} from "../domain/audit-history-presentation";
import type {
  AuditDisplayValue,
  AuditHistoryItemDto,
  AuditHistoryResponseDto,
} from "../types/audit-history.types";

function formatAuditTimestamp(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function actionBadgeVariant(action: AuditHistoryItemDto["action"]) {
  if (action === "DELETE" || action === "ARCHIVE") {
    return "destructive" as const;
  }

  if (action === "INSERT" || action === "RESTORE") {
    return "default" as const;
  }

  return "secondary" as const;
}

function AuditValue({ value }: { value: AuditDisplayValue }) {
  if (value === "[REDACTED]" || value === "[DADO PROTEGIDO]") {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1.5 text-sm font-medium">
        <LockKeyhole aria-hidden="true" className="size-3.5" />
        Dado protegido
      </span>
    );
  }

  if (value === null) {
    return <span className="text-muted-foreground text-sm">Sem valor</span>;
  }

  const serialized =
    typeof value === "string"
      ? getAuditValueLabel(value)
      : JSON.stringify(value, null, 2);

  return (
    <pre className="font-mono text-xs leading-5 break-words whitespace-pre-wrap">
      {serialized}
    </pre>
  );
}

function AuditDiff({ item }: { item: AuditHistoryItemDto }) {
  if (item.changes.length === 0) {
    return (
      <p className="text-muted-foreground py-2 text-sm">
        Esta revisão não registrou campos alterados.
      </p>
    );
  }

  return (
    <div className="grid gap-3 pt-3">
      {item.changes.map((change) => (
        <section
          aria-label={`Alteração em ${getAuditFieldLabel(change.field)}`}
          className="overflow-hidden rounded-xl border bg-white"
          key={change.field}
        >
          <h4 className="border-b bg-neutral-50 px-3 py-2 text-sm font-semibold">
            {getAuditFieldLabel(change.field)}
          </h4>
          <div className="grid md:grid-cols-2">
            <div className="min-w-0 border-b p-3 md:border-r md:border-b-0">
              <p className="text-muted-foreground mb-2 text-xs font-semibold">
                Antes
              </p>
              <AuditValue value={change.before} />
            </div>
            <div className="bg-brand-blue-soft/40 min-w-0 p-3">
              <p className="text-brand-blue mb-2 text-xs font-semibold">
                Depois
              </p>
              <AuditValue value={change.after} />
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function AuditMetadata({ item }: { item: AuditHistoryItemDto }) {
  return (
    <dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-muted-foreground">Ator</dt>
        <dd className="font-medium">
          {getAuditActorTypeLabel(item.actor.actorType)}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Origem</dt>
        <dd className="font-medium">{getAuditSourceLabel(item.source)}</dd>
      </div>
      <div className="min-w-0">
        <dt className="text-muted-foreground">ID do ator</dt>
        <dd
          className="truncate font-mono text-xs"
          title={item.actor.accountId ?? undefined}
        >
          {item.actor.accountId ?? "Não aplicável"}
        </dd>
      </div>
      <div className="min-w-0">
        <dt className="text-muted-foreground">ID da solicitação</dt>
        <dd
          className="truncate font-mono text-xs"
          title={item.requestId ?? undefined}
        >
          {item.requestId ?? "Não informado"}
        </dd>
      </div>
    </dl>
  );
}

function AuditDetails({ item }: { item: AuditHistoryItemDto }) {
  return (
    <details className="group">
      <summary className="text-brand-blue focus-visible:ring-ring inline-flex min-h-11 cursor-pointer items-center rounded-lg text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2">
        Ver alterações ({item.changes.length})
      </summary>
      <div className="border-t pt-4">
        <AuditMetadata item={item} />
        {item.reason ? (
          <div className="mt-4">
            <p className="text-muted-foreground text-xs font-semibold">
              Motivo registrado
            </p>
            <p className="mt-1 text-sm leading-6">{item.reason}</p>
          </div>
        ) : null}
        <AuditDiff item={item} />
      </div>
    </details>
  );
}

function DesktopAuditHistory({ items }: { items: AuditHistoryItemDto[] }) {
  return (
    <section
      aria-label="Histórico de auditoria em tabela"
      className="hidden overflow-hidden rounded-xl border bg-white lg:block"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Revisão</TableHead>
            <TableHead>Entidade</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead>Data e hora</TableHead>
            <TableHead>Detalhes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.revision}>
              <TableCell className="align-top font-mono text-xs">
                #{item.revision}
              </TableCell>
              <TableCell className="max-w-56 align-top">
                <p className="font-semibold">
                  {getAuditEntityLabel(item.entity)}
                </p>
                <p
                  className="text-muted-foreground truncate font-mono text-xs"
                  title={item.record}
                >
                  {item.record}
                </p>
              </TableCell>
              <TableCell className="align-top">
                <Badge variant={actionBadgeVariant(item.action)}>
                  {getAuditActionLabel(item.action)}
                </Badge>
              </TableCell>
              <TableCell className="align-top text-sm whitespace-nowrap">
                {formatAuditTimestamp(item.occurredAt)}
              </TableCell>
              <TableCell className="min-w-80 align-top">
                <AuditDetails item={item} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

function MobileAuditHistory({ items }: { items: AuditHistoryItemDto[] }) {
  return (
    <section
      aria-label="Histórico de auditoria em cartões"
      className="grid gap-4 lg:hidden"
    >
      {items.map((item) => (
        <Card key={item.revision}>
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground font-mono text-xs">
                Revisão #{item.revision}
              </span>
              <Badge variant={actionBadgeVariant(item.action)}>
                {getAuditActionLabel(item.action)}
              </Badge>
            </div>
            <CardTitle>{getAuditEntityLabel(item.entity)}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Data e hora</dt>
                <dd className="font-medium">
                  {formatAuditTimestamp(item.occurredAt)}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground">Registro</dt>
                <dd className="truncate font-mono text-xs" title={item.record}>
                  {item.record}
                </dd>
              </div>
            </dl>
          </CardContent>
          <CardFooter className="block">
            <AuditDetails item={item} />
          </CardFooter>
        </Card>
      ))}
    </section>
  );
}

export function AuditHistoryResults({
  onPageChange,
  response,
}: {
  onPageChange?: (page: number) => void;
  response: AuditHistoryResponseDto;
}) {
  if (response.items.length === 0) {
    return (
      <Card className="items-center px-5 py-10 text-center">
        <FileClock aria-hidden="true" className="text-brand-blue size-8" />
        <CardTitle>Nenhum registro de auditoria encontrado</CardTitle>
        <p className="text-muted-foreground max-w-md">
          Ajuste os filtros para consultar outro conjunto de revisões.
        </p>
      </Card>
    );
  }

  const { page, totalPages } = response.pagination;

  return (
    <div className="space-y-5">
      <DesktopAuditHistory items={response.items} />
      <MobileAuditHistory items={response.items} />

      <nav
        aria-label="Paginação do histórico de auditoria"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <p aria-live="polite" className="text-muted-foreground text-sm">
          Página {page} de {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            aria-label="Página anterior"
            disabled={page <= 1}
            onClick={() => onPageChange?.(page - 1)}
            size="sm"
            type="button"
            variant="outline"
          >
            <ArrowLeft aria-hidden="true" />
            Anterior
          </Button>
          <Button
            aria-label="Próxima página"
            disabled={page >= totalPages}
            onClick={() => onPageChange?.(page + 1)}
            size="sm"
            type="button"
            variant="outline"
          >
            Próxima
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </nav>
    </div>
  );
}

"use client";

import { ArrowLeft, ArrowRight, MailWarning } from "lucide-react";

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
  formatAdminEmailTimestamp,
  getAdminEmailRetryExplanation,
  getAdminEmailStatusLabel,
  getAdminEmailTemplateLabel,
} from "../domain/admin-email-outbox-presentation";
import type {
  AdminEmailOutboxItemDto,
  AdminEmailOutboxListDto,
} from "../types/admin-email-outbox.types";
import { AdminEmailAttemptDialog } from "./admin-email-attempt-dialog.client";
import {
  AdminEmailRetryDialog,
  type AdminEmailRetryAction,
} from "./admin-email-retry-dialog.client";

function statusVariant(status: AdminEmailOutboxItemDto["status"]) {
  return status === "DEAD_LETTER"
    ? ("destructive" as const)
    : ("secondary" as const);
}

function ItemActions({
  item,
  retryAction,
}: {
  item: AdminEmailOutboxItemDto;
  retryAction: AdminEmailRetryAction;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <AdminEmailAttemptDialog outboxId={item.id} reference={item.reference} />
      {item.retry.eligible ? (
        <AdminEmailRetryDialog
          action={retryAction}
          outboxId={item.id}
          reference={item.reference}
        />
      ) : null}
    </div>
  );
}

function DesktopResults({
  items,
  retryAction,
}: {
  items: AdminEmailOutboxItemDto[];
  retryAction: AdminEmailRetryAction;
}) {
  return (
    <section
      aria-label="E-mails operacionais em tabela"
      className="hidden overflow-hidden rounded-xl border bg-white md:block"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mensagem</TableHead>
            <TableHead>Modelo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Tentativas</TableHead>
            <TableHead>Próximo processamento</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <p className="font-semibold">{item.reference}</p>
                <p className="text-muted-foreground text-xs">
                  {item.recipientReference}
                </p>
              </TableCell>
              <TableCell>{getAdminEmailTemplateLabel(item.template)}</TableCell>
              <TableCell>
                <Badge variant={statusVariant(item.status)}>
                  {getAdminEmailStatusLabel(item.status)}
                </Badge>
                <p className="text-muted-foreground mt-2 max-w-xs text-xs leading-5">
                  {getAdminEmailRetryExplanation(item.retry)}
                </p>
              </TableCell>
              <TableCell>
                {item.attemptCount} de {item.maxAttempts}
              </TableCell>
              <TableCell>{formatAdminEmailTimestamp(item.dueAt)}</TableCell>
              <TableCell>
                <ItemActions item={item} retryAction={retryAction} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

function MobileResults({
  items,
  retryAction,
}: {
  items: AdminEmailOutboxItemDto[];
  retryAction: AdminEmailRetryAction;
}) {
  return (
    <section
      aria-label="E-mails operacionais em cartões"
      className="grid gap-4 md:hidden"
    >
      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <CardTitle>{getAdminEmailTemplateLabel(item.template)}</CardTitle>
            <Badge variant={statusVariant(item.status)}>
              {getAdminEmailStatusLabel(item.status)}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Referência</dt>
                <dd className="font-medium">{item.reference}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Destino</dt>
                <dd className="font-medium">{item.recipientReference}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tentativas</dt>
                <dd className="font-medium">
                  {item.attemptCount} de {item.maxAttempts}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Processamento</dt>
                <dd className="font-medium">
                  {formatAdminEmailTimestamp(item.dueAt)}
                </dd>
              </div>
            </dl>
            <p className="text-muted-foreground text-sm leading-6">
              {getAdminEmailRetryExplanation(item.retry)}
            </p>
          </CardContent>
          <CardFooter className="justify-end">
            <ItemActions item={item} retryAction={retryAction} />
          </CardFooter>
        </Card>
      ))}
    </section>
  );
}

export function AdminEmailOutboxResults({
  onPageChange,
  response,
  retryAction,
}: {
  onPageChange?: (page: number) => void;
  response: AdminEmailOutboxListDto;
  retryAction: AdminEmailRetryAction;
}) {
  if (response.items.length === 0) {
    return (
      <Card className="items-center px-5 py-10 text-center">
        <MailWarning aria-hidden="true" className="text-brand-blue size-8" />
        <CardTitle>Nenhum e-mail operacional encontrado</CardTitle>
        <p className="text-muted-foreground max-w-md">
          Não há mensagens pendentes ou com falha para os filtros selecionados.
        </p>
      </Card>
    );
  }

  const { page, totalPages } = response.pagination;

  return (
    <div className="space-y-5">
      <DesktopResults items={response.items} retryAction={retryAction} />
      <MobileResults items={response.items} retryAction={retryAction} />

      <nav
        aria-label="Paginação dos e-mails operacionais"
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

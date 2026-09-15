"use client";

import { ArrowLeft, ArrowRight, MailWarning } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Checkbox } from "@/shared/components/ui/checkbox";
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
  AdminEmailBatchRetryDialog,
  type AdminEmailBatchRetryAction,
} from "./admin-email-batch-retry-dialog.client";
import {
  AdminEmailRetryDialog,
  type AdminEmailRetryAction,
} from "./admin-email-retry-dialog.client";

function statusVariant(status: AdminEmailOutboxItemDto["status"]) {
  return status === "DEAD_LETTER"
    ? ("destructive" as const)
    : ("secondary" as const);
}

function eligibleIds(items: AdminEmailOutboxItemDto[]) {
  return items.filter((item) => item.retry.eligible).map((item) => item.id);
}

interface SelectionProps {
  onToggle: (outboxId: string, checked: boolean) => void;
  selected: Set<string>;
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

function RowSelectionCheckbox({
  item,
  onToggle,
  selected,
}: SelectionProps & { item: AdminEmailOutboxItemDto }) {
  if (!item.retry.eligible) {
    return <span aria-hidden="true" className="block size-4" />;
  }

  return (
    <Checkbox
      aria-label={`Selecionar ${item.reference} para reenvio em lote`}
      checked={selected.has(item.id)}
      onCheckedChange={(checked) => onToggle(item.id, checked === true)}
    />
  );
}

function DesktopResults({
  items,
  onToggle,
  onToggleAll,
  retryAction,
  selected,
}: {
  items: AdminEmailOutboxItemDto[];
  onToggleAll: (checked: boolean) => void;
  retryAction: AdminEmailRetryAction;
} & SelectionProps) {
  const eligible = eligibleIds(items);
  const selectedEligible = eligible.filter((id) => selected.has(id));
  const allSelected =
    eligible.length > 0 && selectedEligible.length === eligible.length;
  const someSelected =
    selectedEligible.length > 0 && selectedEligible.length < eligible.length;

  return (
    <section
      aria-label="E-mails operacionais em tabela"
      className="hidden overflow-hidden rounded-xl border bg-white md:block"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                aria-label="Selecionar todos os e-mails elegíveis desta página"
                checked={allSelected}
                disabled={eligible.length === 0}
                indeterminate={someSelected}
                onCheckedChange={(checked) => onToggleAll(checked === true)}
              />
            </TableHead>
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
                <RowSelectionCheckbox
                  item={item}
                  onToggle={onToggle}
                  selected={selected}
                />
              </TableCell>
              <TableCell>
                <p className="font-semibold">{item.reference}</p>
                <p className="text-muted-foreground text-xs">
                  {item.recipientEmail}
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
  onToggle,
  retryAction,
  selected,
}: {
  items: AdminEmailOutboxItemDto[];
  retryAction: AdminEmailRetryAction;
} & SelectionProps) {
  return (
    <section
      aria-label="E-mails operacionais em cartões"
      className="grid gap-4 md:hidden"
    >
      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle>{getAdminEmailTemplateLabel(item.template)}</CardTitle>
              <RowSelectionCheckbox
                item={item}
                onToggle={onToggle}
                selected={selected}
              />
            </div>
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
                <dd className="font-medium">{item.recipientEmail}</dd>
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
  batchRetryAction,
  onPageChange,
  response,
  retryAction,
}: {
  batchRetryAction: AdminEmailBatchRetryAction;
  onPageChange?: (page: number) => void;
  response: AdminEmailOutboxListDto;
  retryAction: AdminEmailRetryAction;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  function toggle(outboxId: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(outboxId);
      } else {
        next.delete(outboxId);
      }
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(eligibleIds(response.items)) : new Set());
  }

  const selectedItems = response.items.filter((item) => selected.has(item.id));

  return (
    <div className="space-y-5">
      {selectedItems.length > 0 ? (
        <div
          aria-live="polite"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-slate-50 p-4"
        >
          <p className="text-sm font-medium">
            {selectedItems.length} e-mails selecionados para reenvio em lote
          </p>
          <AdminEmailBatchRetryDialog
            action={batchRetryAction}
            items={selectedItems.map((item) => ({
              id: item.id,
              recipientEmail: item.recipientEmail,
              reference: item.reference,
            }))}
            onSuccess={() => setSelected(new Set())}
          />
        </div>
      ) : null}

      <DesktopResults
        items={response.items}
        onToggle={toggle}
        onToggleAll={toggleAll}
        retryAction={retryAction}
        selected={selected}
      />
      <MobileResults
        items={response.items}
        onToggle={toggle}
        retryAction={retryAction}
        selected={selected}
      />

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

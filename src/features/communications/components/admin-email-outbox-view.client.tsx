"use client";

import {
  AlertCircle,
  Clock3,
  MailCheck,
  MailWarning,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { useAdminEmailOutboxList } from "../hooks/use-admin-email-outbox";
import { serializeAdminEmailOutboxFilters } from "../schemas/admin-email-outbox.schema";
import type {
  AdminEmailOutboxFilters,
  AdminEmailOutboxListDto,
  AdminEmailOutboxOrder,
  AdminEmailOutboxStatus,
  AdminEmailTemplate,
} from "../types/admin-email-outbox.types";
import { AdminEmailOutboxResults } from "./admin-email-outbox-results";
import type { AdminEmailRetryAction } from "./admin-email-retry-dialog.client";

type ListQuery =
  | { status: "error"; retry?: () => void }
  | { status: "loading" }
  | { data: AdminEmailOutboxListDto; status: "success" };

const emptyList: AdminEmailOutboxListDto = {
  counts: { DEAD_LETTER: 0, FAILED: 0, PENDING: 0 },
  items: [],
  pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
};

function SummaryCards({ data }: { data: AdminEmailOutboxListDto }) {
  return (
    <section
      aria-label="Resumo dos e-mails operacionais"
      className="grid gap-3 sm:grid-cols-3"
    >
      <Card size="sm">
        <CardHeader>
          <Clock3 aria-hidden="true" className="text-brand-blue size-5" />
          <CardTitle>{data.counts.PENDING} pendentes</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Aguardando a primeira tentativa.
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <MailCheck aria-hidden="true" className="text-brand-blue size-5" />
          <CardTitle>{data.counts.FAILED} tentativas automáticas</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Falhas ainda cobertas pelo processamento automático.
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <MailWarning aria-hidden="true" className="text-destructive size-5" />
          <CardTitle>{data.counts.DEAD_LETTER} falhas definitivas</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Mensagens que podem exigir investigação manual.
        </CardContent>
      </Card>
    </section>
  );
}

export function AdminEmailOutboxView({
  filters,
  onFiltersChange,
  query,
  retryAction,
}: {
  filters: AdminEmailOutboxFilters;
  onFiltersChange: (filters: AdminEmailOutboxFilters) => void;
  query: ListQuery;
  retryAction: AdminEmailRetryAction;
}) {
  function update(patch: Partial<AdminEmailOutboxFilters>) {
    onFiltersChange({ ...filters, ...patch, page: 1 });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-brand-blue text-sm font-bold">
          Comunicação transacional
        </p>
        <h1 className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
          E-mails operacionais
        </h1>
        <p className="text-muted-foreground max-w-3xl leading-7">
          Acompanhe mensagens pendentes e falhas de entrega. Endereços e
          conteúdo das mensagens permanecem protegidos nesta visualização.
        </p>
      </div>

      <SummaryCards
        data={query.status === "success" ? query.data : emptyList}
      />

      <Alert>
        <ShieldCheck aria-hidden="true" />
        <AlertTitle>Intervenção manual controlada</AlertTitle>
        <AlertDescription>
          Somente falhas definitivas elegíveis exibem o reenvio manual. Cada
          solicitação exige motivo, confirmação, nova autorização administrativa
          e registro de auditoria.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="grid gap-4 pt-1 md:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="email-outbox-status">Status</FieldLabel>
            <Select
              items={{
                ALL: "Todos os status",
                DEAD_LETTER: "Falha definitiva",
                FAILED: "Tentativa automática",
                PENDING: "Pendente",
              }}
              onValueChange={(value) =>
                update({
                  status:
                    value && value !== "ALL"
                      ? (value as AdminEmailOutboxStatus)
                      : undefined,
                })
              }
              value={filters.status ?? "ALL"}
            >
              <SelectTrigger className="h-11 w-full" id="email-outbox-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os status</SelectItem>
                <SelectItem value="PENDING">Pendente</SelectItem>
                <SelectItem value="FAILED">Tentativa automática</SelectItem>
                <SelectItem value="DEAD_LETTER">Falha definitiva</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="email-outbox-template">Mensagem</FieldLabel>
            <Select
              items={{
                ALL: "Todos os modelos",
                APPROVED: "Cadastro aprovado",
                BANNED: "Conta bloqueada",
                CHANGES_REQUESTED: "Correções solicitadas",
                ONBOARDING_RECEIVED: "Cadastro recebido",
                RESTORED: "Acesso restaurado",
                SUSPENDED: "Acesso suspenso",
              }}
              onValueChange={(value) =>
                update({
                  template:
                    value && value !== "ALL"
                      ? (value as AdminEmailTemplate)
                      : undefined,
                })
              }
              value={filters.template ?? "ALL"}
            >
              <SelectTrigger className="h-11 w-full" id="email-outbox-template">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os modelos</SelectItem>
                <SelectItem value="ONBOARDING_RECEIVED">
                  Cadastro recebido
                </SelectItem>
                <SelectItem value="CHANGES_REQUESTED">
                  Correções solicitadas
                </SelectItem>
                <SelectItem value="APPROVED">Cadastro aprovado</SelectItem>
                <SelectItem value="SUSPENDED">Acesso suspenso</SelectItem>
                <SelectItem value="RESTORED">Acesso restaurado</SelectItem>
                <SelectItem value="BANNED">Conta bloqueada</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="email-outbox-order">Ordenação</FieldLabel>
            <Select
              items={{
                ATTENTION_FIRST: "Falhas definitivas primeiro",
                NEWEST: "Mensagens mais recentes",
                NEXT_DUE: "Próximo processamento",
                OLDEST: "Mensagens mais antigas",
              }}
              onValueChange={(value) =>
                value && update({ order: value as AdminEmailOutboxOrder })
              }
              value={filters.order}
            >
              <SelectTrigger className="h-11 w-full" id="email-outbox-order">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ATTENTION_FIRST">
                  Falhas definitivas primeiro
                </SelectItem>
                <SelectItem value="NEXT_DUE">Próximo processamento</SelectItem>
                <SelectItem value="OLDEST">Mensagens mais antigas</SelectItem>
                <SelectItem value="NEWEST">Mensagens mais recentes</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      {query.status === "loading" ? (
        <div aria-live="polite" className="space-y-3" role="status">
          <span className="sr-only">Carregando e-mails operacionais</span>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}

      {query.status === "error" ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Não foi possível carregar os e-mails</AlertTitle>
          <AlertDescription>
            Confirme se sua sessão administrativa continua ativa e tente
            novamente.
          </AlertDescription>
          <Button
            className="mt-3 w-fit"
            onClick={() => query.retry?.()}
            size="sm"
            type="button"
            variant="outline"
          >
            <RotateCcw aria-hidden="true" />
            Tentar novamente
          </Button>
        </Alert>
      ) : null}

      {query.status === "success" ? (
        <AdminEmailOutboxResults
          onPageChange={(page) => onFiltersChange({ ...filters, page })}
          response={query.data}
          retryAction={retryAction}
        />
      ) : null}
    </div>
  );
}

export function AdminEmailOutboxScreen({
  filters,
  retryAction,
}: {
  filters: AdminEmailOutboxFilters;
  retryAction: AdminEmailRetryAction;
}) {
  const router = useRouter();
  const query = useAdminEmailOutboxList(filters);

  return (
    <AdminEmailOutboxView
      filters={filters}
      onFiltersChange={(nextFilters) => {
        router.replace(
          `/backoffice/emails?${serializeAdminEmailOutboxFilters(nextFilters).toString()}`,
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
      retryAction={retryAction}
    />
  );
}

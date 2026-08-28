"use client";

import {
  AlertCircle,
  Building2,
  CalendarDays,
  Clock3,
  RefreshCcw,
  RotateCcw,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Field, FieldLabel } from "@/shared/components/ui/field";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/shared/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  formatNumber,
  formatPercentage,
} from "@/shared/lib/formatting/formatters";

import { useBackofficeAnalytics } from "../hooks/use-backoffice-analytics";
import {
  backofficeAnalyticsPeriodDaysSchema,
  serializeBackofficeAnalyticsFilters,
} from "../schemas/backoffice-analytics.schema";
import type {
  BackofficeAnalyticsFilters,
  BackofficeAnalyticsResponseDto,
  BackofficeAnalyticsRoleSummaryDto,
} from "../types/backoffice-analytics.types";

type AnalyticsDashboardQuery =
  | {
      data?: undefined;
      isRefreshing?: false;
      retry?: () => void;
      status: "error" | "loading";
    }
  | {
      data: BackofficeAnalyticsResponseDto;
      isRefreshing?: boolean;
      retry?: () => void;
      status: "success";
    };

const statusLabels = {
  APPROVED: "Aprovados",
  BANNED: "Banidos",
  CHANGES_REQUESTED: "Correções solicitadas",
  ONBOARDING: "Cadastro em andamento",
  PENDING_REVIEW: "Aguardando análise",
  SUSPENDED: "Suspensos",
} as const;

const periodLabels = {
  7: "Últimos 7 dias",
  30: "Últimos 30 dias",
  90: "Últimos 90 dias",
} as const;

function AnalyticsLoading() {
  return (
    <div
      aria-live="polite"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      role="status"
    >
      <span className="sr-only">Carregando indicadores</span>
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton className="h-36 w-full" key={index} />
      ))}
      <Skeleton className="h-48 w-full sm:col-span-2 xl:col-span-4" />
    </div>
  );
}

function AnalyticsError({ retry }: { retry?: () => void }) {
  return (
    <Alert role="alert" variant="destructive">
      <AlertCircle aria-hidden="true" />
      <AlertTitle>Não foi possível carregar os indicadores</AlertTitle>
      <AlertDescription>
        Tente novamente. Se o problema continuar, confirme sua sessão
        administrativa.
      </AlertDescription>
      <Button
        className="mt-3 min-h-11 w-fit"
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

function AnalyticsEmpty() {
  return (
    <Card>
      <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
        <UsersRound
          aria-hidden="true"
          className="text-muted-foreground size-8"
        />
        <div className="space-y-1">
          <h2 className="font-bold">Ainda não há dados operacionais</h2>
          <p className="text-muted-foreground max-w-md text-sm leading-6">
            Os indicadores aparecerão quando houver cadastros não arquivados de
            influenciadores ou empresas.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCard({
  description,
  icon: Icon,
  label,
  value,
}: {
  description: React.ReactNode;
  icon: typeof UsersRound;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <CardDescription>{label}</CardDescription>
          <span className="bg-brand-blue-soft text-brand-blue flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Icon aria-hidden="true" className="size-5" />
          </span>
        </div>
        <CardTitle className="text-3xl tabular-nums">
          {formatNumber(value)}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm leading-6">
        {description}
      </CardContent>
    </Card>
  );
}

function RoleBreakdown({
  label,
  summary,
}: {
  label: string;
  summary: BackofficeAnalyticsRoleSummaryDto;
}) {
  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{label}</CardTitle>
          <Badge variant="outline">{formatNumber(summary.total)} contas</Badge>
        </div>
        <CardDescription>
          Distribuição atual por status, sem contas arquivadas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
          {Object.entries(statusLabels).map(([status, statusLabel]) => (
            <div className="min-w-0" key={status}>
              <dt className="text-muted-foreground text-xs leading-5">
                {statusLabel}
              </dt>
              <dd className="text-lg font-bold tabular-nums">
                {formatNumber(
                  summary.byStatus[status as keyof typeof summary.byStatus],
                )}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function CompletionCard({
  completion,
}: {
  completion: BackofficeAnalyticsResponseDto["completion"];
}) {
  return (
    <Card className="sm:col-span-2">
      <CardHeader>
        <CardTitle>Completude dos perfis</CardTitle>
        <CardDescription>
          Média calculada com a mesma versão usada nas telas de perfil.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={completion.percentage}>
          <ProgressLabel>Média de completude</ProgressLabel>
          <ProgressValue>
            {() => formatPercentage(completion.percentage / 100)}
          </ProgressValue>
        </Progress>
        <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <span>
            <strong className="text-foreground tabular-nums">
              {formatNumber(completion.completedProfiles)}
            </strong>{" "}
            perfis com 100%
          </span>
          <span>
            <strong className="text-foreground tabular-nums">
              {formatNumber(completion.totalProfiles)}
            </strong>{" "}
            perfis elegíveis
          </span>
          <span>Calculadora v{completion.calculatorVersion}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsContent({ data }: { data: BackofficeAnalyticsResponseDto }) {
  const hasAccounts = data.totals.influencers + data.totals.companies > 0;

  if (!hasAccounts) {
    return <AnalyticsEmpty />;
  }

  return (
    <div className="space-y-6">
      <section
        aria-label="Resumo operacional"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <SummaryCard
          description="Cadastros ativos ou em operação, sem arquivados."
          icon={UsersRound}
          label="Influenciadores"
          value={data.totals.influencers}
        />
        <SummaryCard
          description="Empresas ativas ou em operação, sem arquivadas."
          icon={Building2}
          label="Empresas"
          value={data.totals.companies}
        />
        <SummaryCard
          description={
            <span className="grid gap-2">
              <span>Cadastros pendentes de uma decisão administrativa.</span>
              <span className="flex flex-wrap gap-x-4 gap-y-2">
                <Link
                  className="text-brand-blue inline-flex min-h-11 items-center font-semibold underline-offset-4 hover:underline"
                  href="/backoffice/moderation?role=INFLUENCER&status=PENDING_REVIEW"
                >
                  Fila de influenciadores (
                  {formatNumber(data.byRole.INFLUENCER.byStatus.PENDING_REVIEW)}
                  )
                </Link>
                <Link
                  className="text-brand-blue inline-flex min-h-11 items-center font-semibold underline-offset-4 hover:underline"
                  href="/backoffice/moderation?role=COMPANY&status=PENDING_REVIEW"
                >
                  Fila de empresas (
                  {formatNumber(data.byRole.COMPANY.byStatus.PENDING_REVIEW)})
                </Link>
              </span>
            </span>
          }
          icon={Clock3}
          label="Aguardando análise"
          value={data.totals.awaitingApproval}
        />
        <SummaryCard
          description={
            <>
              {formatNumber(data.newRegistrations.byRole.INFLUENCER)}{" "}
              influenciadores e{" "}
              {formatNumber(data.newRegistrations.byRole.COMPANY)} empresas em{" "}
              {periodLabels[data.period.days].toLowerCase()}.
            </>
          }
          icon={CalendarDays}
          label="Novos cadastros"
          value={data.newRegistrations.total}
        />
      </section>

      <section
        aria-labelledby="completion-heading"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <h2 className="sr-only" id="completion-heading">
          Completude e distribuição por papel
        </h2>
        <CompletionCard completion={data.completion} />
        <RoleBreakdown
          label="Influenciadores"
          summary={data.byRole.INFLUENCER}
        />
        <RoleBreakdown label="Empresas" summary={data.byRole.COMPANY} />
      </section>
    </div>
  );
}

export function BackofficeAnalyticsDashboard({
  filters,
  onFiltersChange,
  query,
}: {
  filters: BackofficeAnalyticsFilters;
  onFiltersChange: (filters: BackofficeAnalyticsFilters) => void;
  query: AnalyticsDashboardQuery;
}) {
  return (
    <div aria-busy={query.status === "loading"} className="space-y-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-brand-blue text-sm font-bold">
            Operação da plataforma
          </p>
          <h1 className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
            Visão geral
          </h1>
          <p className="text-muted-foreground max-w-2xl leading-7">
            Acompanhe o volume de cadastros, as filas e a qualidade dos perfis
            sem expor dados pessoais.
          </p>
        </div>

        <Field className="w-full sm:w-56">
          <FieldLabel htmlFor="analytics-period">
            Período de novos cadastros
          </FieldLabel>
          <Select
            items={periodLabels}
            onValueChange={(value) => {
              if (!value) return;
              onFiltersChange({
                periodDays: backofficeAnalyticsPeriodDaysSchema.parse(
                  Number(value),
                ),
              });
            }}
            value={String(filters.periodDays)}
          >
            <SelectTrigger
              className="w-full"
              id="analytics-period"
              aria-label="Período de novos cadastros"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {query.status === "success" && query.isRefreshing ? (
        <div
          aria-live="polite"
          className="text-muted-foreground flex items-center gap-2 text-sm"
          role="status"
        >
          <RefreshCcw aria-hidden="true" className="size-4 animate-spin" />
          Atualizando indicadores
        </div>
      ) : null}

      {query.status === "loading" ? <AnalyticsLoading /> : null}
      {query.status === "error" ? <AnalyticsError retry={query.retry} /> : null}
      {query.status === "success" ? (
        <AnalyticsContent data={query.data} />
      ) : null}
    </div>
  );
}

export function BackofficeAnalyticsScreen({
  filters,
}: {
  filters: BackofficeAnalyticsFilters;
}) {
  const router = useRouter();
  const query = useBackofficeAnalytics(filters);

  return (
    <BackofficeAnalyticsDashboard
      filters={filters}
      onFiltersChange={(nextFilters) => {
        router.replace(
          `/backoffice?${serializeBackofficeAnalyticsFilters(nextFilters).toString()}`,
          { scroll: false },
        );
      }}
      query={
        query.isPending
          ? { status: "loading" }
          : query.isError
            ? { retry: () => void query.refetch(), status: "error" }
            : {
                data: query.data,
                isRefreshing: query.isFetching,
                status: "success",
              }
      }
    />
  );
}

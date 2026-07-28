"use client";

import { AlertCircle, RotateCcw, Search } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { useAccountManagement } from "../hooks/use-account-management";
import { serializeAccountManagementFilters } from "../schemas/account-management.schema";
import type {
  AccountManagementFilters,
  AccountManagementResponseDto,
  ManagedAccountArchiveFilter,
  ManagedAccountOrder,
  ManagedAccountRole,
  ManagedAccountStatus,
} from "../types/account-management.types";
import { AccountManagementResults } from "./account-management-results";

type AccountViewQuery =
  | {
      data?: undefined;
      retry?: () => void;
      status: "error" | "loading";
    }
  | {
      data: AccountManagementResponseDto;
      retry?: () => void;
      status: "success";
    };

function AccountLoading() {
  return (
    <div aria-live="polite" className="space-y-3" role="status">
      <span className="sr-only">Carregando contas</span>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function AccountError({ retry }: { retry?: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertCircle aria-hidden="true" />
      <AlertTitle>Não foi possível carregar as contas</AlertTitle>
      <AlertDescription>
        Tente novamente. Se o problema continuar, confirme sua sessão
        administrativa.
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

export function AccountManagementView({
  filters,
  onFiltersChange,
  query,
}: {
  filters: AccountManagementFilters;
  onFiltersChange: (filters: AccountManagementFilters) => void;
  query: AccountViewQuery;
}) {
  const [search, setSearch] = useState(filters.search);

  function update(
    patch: Partial<AccountManagementFilters>,
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
        <p className="text-brand-blue text-sm font-bold">Operação de contas</p>
        <h1 className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
          Contas da plataforma
        </h1>
        <p className="text-muted-foreground max-w-2xl leading-7">
          Pesquise cadastros, acompanhe seus estados e abra o histórico completo
          antes de qualquer operação administrativa.
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-5 pt-1">
          <form
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1fr)_12rem_13rem_12rem_12rem_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              update({ search: search.trim() });
            }}
            role="search"
          >
            <Field className="sm:col-span-2 xl:col-span-1">
              <FieldLabel htmlFor="account-search">Buscar conta</FieldLabel>
              <Input
                id="account-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome, e-mail ou CNPJ"
                type="search"
                value={search}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="account-role">Papel</FieldLabel>
              <Select
                items={{
                  ALL: "Todos os papéis",
                  ADMIN: "Administrador",
                  COMPANY: "Empresa",
                  INFLUENCER: "Influenciador",
                }}
                onValueChange={(value) =>
                  update({
                    role:
                      value && value !== "ALL"
                        ? (value as ManagedAccountRole)
                        : undefined,
                  })
                }
                value={filters.role ?? "ALL"}
              >
                <SelectTrigger className="h-11 w-full" id="account-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os papéis</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                  <SelectItem value="INFLUENCER">Influenciador</SelectItem>
                  <SelectItem value="COMPANY">Empresa</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="account-status">Status</FieldLabel>
              <Select
                items={{
                  ALL: "Todos os status",
                  APPROVED: "Aprovado",
                  BANNED: "Banido",
                  CHANGES_REQUESTED: "Correções solicitadas",
                  ONBOARDING: "Cadastro em andamento",
                  PENDING_REVIEW: "Aguardando análise",
                  SUSPENDED: "Suspenso",
                }}
                onValueChange={(value) =>
                  update({
                    status:
                      value && value !== "ALL"
                        ? (value as ManagedAccountStatus)
                        : undefined,
                  })
                }
                value={filters.status ?? "ALL"}
              >
                <SelectTrigger className="h-11 w-full" id="account-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os status</SelectItem>
                  <SelectItem value="ONBOARDING">
                    Cadastro em andamento
                  </SelectItem>
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
              <FieldLabel htmlFor="account-archive">Arquivamento</FieldLabel>
              <Select
                items={{
                  ACTIVE: "Ativas",
                  ALL: "Ativas e arquivadas",
                  ARCHIVED: "Arquivadas",
                }}
                onValueChange={(value) =>
                  value &&
                  update({ archive: value as ManagedAccountArchiveFilter })
                }
                value={filters.archive}
              >
                <SelectTrigger className="h-11 w-full" id="account-archive">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Ativas</SelectItem>
                  <SelectItem value="ARCHIVED">Arquivadas</SelectItem>
                  <SelectItem value="ALL">Ativas e arquivadas</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="account-order">Ordenação</FieldLabel>
              <Select
                items={{
                  COMPLETION_DESC: "Maior completude",
                  NAME_ASC: "Nome (A–Z)",
                  NEWEST: "Mais recentes",
                  OLDEST: "Mais antigas",
                }}
                onValueChange={(value) =>
                  value && update({ order: value as ManagedAccountOrder })
                }
                value={filters.order}
              >
                <SelectTrigger className="h-11 w-full" id="account-order">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEWEST">Mais recentes</SelectItem>
                  <SelectItem value="OLDEST">Mais antigas</SelectItem>
                  <SelectItem value="NAME_ASC">Nome (A–Z)</SelectItem>
                  <SelectItem value="COMPLETION_DESC">
                    Maior completude
                  </SelectItem>
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

      {query.status === "loading" ? <AccountLoading /> : null}
      {query.status === "error" ? <AccountError retry={query.retry} /> : null}
      {query.status === "success" ? (
        <AccountManagementResults
          onPageChange={(page) => update({ page }, { keepPage: true })}
          response={query.data}
        />
      ) : null}
    </div>
  );
}

export function AccountManagementScreen({
  filters,
}: {
  filters: AccountManagementFilters;
}) {
  const router = useRouter();
  const query = useAccountManagement(filters);

  return (
    <AccountManagementView
      filters={filters}
      onFiltersChange={(nextFilters) => {
        router.replace(
          `/backoffice/accounts?${serializeAccountManagementFilters(nextFilters).toString()}`,
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

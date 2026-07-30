"use client";

import {
  ArrowLeft,
  ArrowRight,
  FileSearch,
  SquareArrowOutUpRight,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/shared/components/ui/badge";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/shared/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { formatDate } from "@/shared/lib/formatting/formatters";

import { getModerationStatusLabel } from "../domain/moderation-presentation";
import type {
  AccountManagementResponseDto,
  ManagedAccountSummaryDto,
} from "../types/account-management.types";

function roleLabel(role: ManagedAccountSummaryDto["role"]) {
  if (role === "ADMIN") {
    return "Administrador";
  }

  if (role === "COMPANY") {
    return "Empresa";
  }

  if (role === "INFLUENCER") {
    return "Influenciador";
  }

  return "Papel não definido";
}

function statusBadgeVariant(status: ManagedAccountSummaryDto["status"]) {
  if (status === "BANNED") {
    return "destructive" as const;
  }

  if (status === "APPROVED") {
    return "default" as const;
  }

  return "secondary" as const;
}

function AccountLink({ item }: { item: ManagedAccountSummaryDto }) {
  return (
    <Link
      aria-label={`Abrir ${item.displayName}`}
      className={buttonVariants({ size: "sm", variant: "outline" })}
      href={`/backoffice/accounts/${item.accountId}`}
    >
      Abrir
      <SquareArrowOutUpRight aria-hidden="true" />
    </Link>
  );
}

function Completion({ item }: { item: ManagedAccountSummaryDto }) {
  return (
    <Progress
      aria-label={`Conclusão de ${item.displayName}: ${item.completionPercentage}%`}
      className="min-w-28 gap-1"
      value={item.completionPercentage}
    >
      <ProgressLabel className="sr-only">Conclusão</ProgressLabel>
      <ProgressValue>{() => `${item.completionPercentage}%`}</ProgressValue>
    </Progress>
  );
}

function DesktopAccounts({ items }: { items: ManagedAccountSummaryDto[] }) {
  return (
    <section
      aria-label="Contas em tabela"
      className="hidden overflow-hidden rounded-xl border bg-white md:block"
      role="region"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Conta</TableHead>
            <TableHead>Papel</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Cadastro</TableHead>
            <TableHead>Completude</TableHead>
            <TableHead className="text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.accountId}>
              <TableCell>
                <p className="font-semibold">{item.displayName}</p>
                <p className="text-muted-foreground text-xs">
                  {item.operationalEmail}
                </p>
              </TableCell>
              <TableCell>{roleLabel(item.role)}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={statusBadgeVariant(item.status)}>
                    {getModerationStatusLabel(item.status)}
                  </Badge>
                  {item.archivedAt ? (
                    <Badge variant="outline">Arquivada</Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>{formatDate(item.createdAt)}</TableCell>
              <TableCell>
                <Completion item={item} />
              </TableCell>
              <TableCell className="text-right">
                <AccountLink item={item} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

function MobileAccounts({ items }: { items: ManagedAccountSummaryDto[] }) {
  return (
    <section
      aria-label="Contas em cartões"
      className="grid gap-4 md:hidden"
      role="region"
    >
      {items.map((item) => (
        <Card key={item.accountId}>
          <CardHeader>
            <CardTitle>{item.displayName}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant={statusBadgeVariant(item.status)}>
                {getModerationStatusLabel(item.status)}
              </Badge>
              {item.archivedAt ? (
                <Badge variant="outline">Arquivada</Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-muted-foreground text-sm break-all">
              {item.operationalEmail}
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Papel</dt>
                <dd className="font-medium">{roleLabel(item.role)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Cadastro</dt>
                <dd className="font-medium">{formatDate(item.createdAt)}</dd>
              </div>
            </dl>
            <Completion item={item} />
          </CardContent>
          <CardFooter>
            <AccountLink item={item} />
          </CardFooter>
        </Card>
      ))}
    </section>
  );
}

export function AccountManagementResults({
  onPageChange,
  response,
}: {
  onPageChange?: (page: number) => void;
  response: AccountManagementResponseDto;
}) {
  if (response.items.length === 0) {
    return (
      <Card className="items-center px-5 py-10 text-center">
        <FileSearch aria-hidden="true" className="text-brand-blue size-8" />
        <CardTitle>Nenhuma conta encontrada</CardTitle>
        <p className="text-muted-foreground max-w-md">
          Ajuste a busca ou os filtros para localizar outro cadastro.
        </p>
      </Card>
    );
  }

  const { page, totalItems, totalPages } = response.pagination;

  return (
    <div className="space-y-5">
      <p aria-live="polite" className="text-muted-foreground text-sm">
        {totalItems}{" "}
        {totalItems === 1 ? "conta encontrada" : "contas encontradas"}
      </p>
      <DesktopAccounts items={response.items} />
      <MobileAccounts items={response.items} />

      <nav
        aria-label="Paginação de contas"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <p className="text-muted-foreground text-sm">
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

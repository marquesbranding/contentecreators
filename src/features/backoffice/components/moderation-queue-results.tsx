"use client";

import { ArrowLeft, ArrowRight, FileSearch } from "lucide-react";
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

import {
  getModerationRoleLabel,
  getModerationStatusLabel,
} from "../domain/moderation-presentation";
import type {
  ModerationQueueItemDto,
  ModerationQueueResponseDto,
} from "../types/moderation-queue.types";

function statusBadgeVariant(status: ModerationQueueItemDto["status"]) {
  if (status === "BANNED") {
    return "destructive" as const;
  }

  if (status === "APPROVED") {
    return "default" as const;
  }

  return "secondary" as const;
}

function ReviewLink({ item }: { item: ModerationQueueItemDto }) {
  return (
    <Link
      className={buttonVariants({ size: "sm", variant: "outline" })}
      href={`/backoffice/moderation/${item.accountId}`}
    >
      Revisar {item.displayName}
    </Link>
  );
}

function Completion({ item }: { item: ModerationQueueItemDto }) {
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

function DesktopQueue({ items }: { items: ModerationQueueItemDto[] }) {
  return (
    <section
      aria-label="Submissões para moderação em tabela"
      className="hidden overflow-hidden rounded-xl border bg-white md:block"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cadastro</TableHead>
            <TableHead>Papel</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Envio</TableHead>
            <TableHead>Completude</TableHead>
            <TableHead className="text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.accountId}>
              <TableCell className="font-semibold">
                {item.displayName}
              </TableCell>
              <TableCell>{getModerationRoleLabel(item.role)}</TableCell>
              <TableCell>
                <Badge variant={statusBadgeVariant(item.status)}>
                  {getModerationStatusLabel(item.status)}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(item.submittedAt)}</TableCell>
              <TableCell>
                <Completion item={item} />
              </TableCell>
              <TableCell className="text-right">
                <ReviewLink item={item} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

function MobileQueue({ items }: { items: ModerationQueueItemDto[] }) {
  return (
    <section
      aria-label="Submissões para moderação em cartões"
      className="grid gap-4 md:hidden"
    >
      {items.map((item) => (
        <Card key={item.accountId}>
          <CardHeader>
            <CardTitle>{item.displayName}</CardTitle>
            <Badge variant={statusBadgeVariant(item.status)}>
              {getModerationStatusLabel(item.status)}
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Papel</dt>
                <dd className="font-medium">
                  {getModerationRoleLabel(item.role)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Enviado em</dt>
                <dd className="font-medium">{formatDate(item.submittedAt)}</dd>
              </div>
            </dl>
            <Completion item={item} />
          </CardContent>
          <CardFooter>
            <ReviewLink item={item} />
          </CardFooter>
        </Card>
      ))}
    </section>
  );
}

export function ModerationQueueResults({
  onPageChange,
  response,
}: {
  onPageChange?: (page: number) => void;
  response: ModerationQueueResponseDto;
}) {
  if (response.items.length === 0) {
    return (
      <Card className="items-center px-5 py-10 text-center">
        <FileSearch aria-hidden="true" className="text-brand-blue size-8" />
        <CardTitle>Nenhum cadastro encontrado</CardTitle>
        <p className="text-muted-foreground max-w-md">
          Ajuste os filtros ou aguarde uma nova submissão para análise.
        </p>
      </Card>
    );
  }

  const { page, totalPages } = response.pagination;

  return (
    <div className="space-y-5">
      <DesktopQueue items={response.items} />
      <MobileQueue items={response.items} />

      <nav
        aria-label="Paginação da fila de moderação"
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

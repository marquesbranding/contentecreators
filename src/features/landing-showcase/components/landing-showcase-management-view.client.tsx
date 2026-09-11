"use client";

import {
  ArrowDown,
  ArrowUp,
  Building2,
  Eye,
  EyeOff,
  LayoutTemplate,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { accountTypeLabels } from "@/shared/domain/account-type-labels";

import type {
  LandingShowcaseCandidateDto,
  LandingShowcaseCommand,
  LandingShowcaseKind,
  LandingShowcaseManagementResponseDto,
} from "../api/landing-showcase-management.contract";
import {
  useLandingShowcaseCandidates,
  useLandingShowcaseCommand,
} from "../hooks/use-landing-showcase-management";

type CommandHandler = (command: LandingShowcaseCommand) => Promise<unknown>;

const kindCopy = {
  COMPANY: {
    description: "Empresas aprovadas com cadastro completo.",
    empty: "Nenhuma empresa aprovada com cadastro completo ainda.",
    icon: Building2,
    noneEnabled: "Nenhuma empresa na landing ainda.",
    searchLabel: "Buscar empresa disponível",
    title: "Empresas",
  },
  CREATOR: {
    description: "Influenciadores e UGCs aprovados.",
    empty: "Nenhum creator aprovado ainda.",
    icon: UserRound,
    noneEnabled: "Nenhum creator na landing ainda.",
    searchLabel: "Buscar creator disponível",
    title: "Influenciadores e UGCs",
  },
} as const satisfies Record<LandingShowcaseKind, unknown>;

const successMessages = {
  DISABLE: "Perfil removido da landing.",
  ENABLE: "Perfil incluído na landing.",
  MOVE_DOWN: "Ordem do carrossel atualizada.",
  MOVE_UP: "Ordem do carrossel atualizada.",
} as const satisfies Record<LandingShowcaseCommand["action"], string>;

function candidateSummary(candidate: LandingShowcaseCandidateDto) {
  const detail =
    candidate.kind === "CREATOR"
      ? candidate.creatorType
        ? accountTypeLabels[candidate.creatorType]
        : null
      : candidate.segment;
  const location = [candidate.city, candidate.state].filter(Boolean).join(", ");

  return [detail, location].filter(Boolean).join(" · ") || "Sem detalhes";
}

function CandidateRow({
  candidate,
  isFirst = false,
  isLast = false,
  onCommand,
  pending,
}: {
  candidate: LandingShowcaseCandidateDto;
  isFirst?: boolean;
  isLast?: boolean;
  onCommand: CommandHandler;
  pending: boolean;
}) {
  const name = candidate.displayName;

  function send(action: LandingShowcaseCommand["action"]) {
    void onCommand({
      action,
      expectedVersion: candidate.version,
      kind: candidate.kind,
      profileId: candidate.profileId,
    });
  }

  return (
    <li
      className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
      data-testid="landing-showcase-candidate"
    >
      <div className="min-w-0">
        <p className="truncate font-semibold">{name}</p>
        <p className="text-muted-foreground truncate text-sm">
          {candidateSummary(candidate)}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {candidate.enabled ? (
          <>
            <Button
              aria-label={`Mover ${name} para antes no carrossel`}
              disabled={pending || isFirst}
              onClick={() => send("MOVE_UP")}
              size="sm"
              variant="outline"
            >
              <ArrowUp aria-hidden="true" />
            </Button>
            <Button
              aria-label={`Mover ${name} para depois no carrossel`}
              disabled={pending || isLast}
              onClick={() => send("MOVE_DOWN")}
              size="sm"
              variant="outline"
            >
              <ArrowDown aria-hidden="true" />
            </Button>
            <Button
              aria-label={`Remover ${name} da landing`}
              disabled={pending}
              onClick={() => send("DISABLE")}
              size="sm"
              variant="outline"
            >
              <EyeOff aria-hidden="true" />
              Remover
            </Button>
          </>
        ) : (
          <Button
            aria-label={`Exibir ${name} na landing`}
            disabled={pending}
            onClick={() => send("ENABLE")}
            size="sm"
          >
            <Eye aria-hidden="true" />
            Exibir na landing
          </Button>
        )}
      </div>
    </li>
  );
}

function KindPanel({
  candidates,
  kind,
  onCommand,
  pending,
}: {
  candidates: readonly LandingShowcaseCandidateDto[];
  kind: LandingShowcaseKind;
  onCommand: CommandHandler;
  pending: boolean;
}) {
  const [search, setSearch] = useState("");
  const copy = kindCopy[kind];
  const Icon = copy.icon;
  // The API already orders enabled profiles by carousel position.
  const enabled = candidates.filter((candidate) => candidate.enabled);
  const query = search.trim().toLocaleLowerCase("pt-BR");
  const available = candidates.filter(
    (candidate) =>
      !candidate.enabled &&
      (!query ||
        candidate.displayName.toLocaleLowerCase("pt-BR").includes(query)),
  );
  const availableEmptyMessage =
    candidates.length === 0
      ? copy.empty
      : query
        ? "Nenhum perfil encontrado para essa busca."
        : "Todos os perfis aptos já estão na landing.";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon aria-hidden="true" className="size-5" />
          {copy.title}
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <section aria-label={`${copy.title} — na landing`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">
              Na landing, em ordem de exibição
            </h2>
            <Badge variant="secondary">{enabled.length}</Badge>
          </div>
          {enabled.length === 0 ? (
            <p className="text-muted-foreground mt-2 text-sm">
              {copy.noneEnabled}
            </p>
          ) : (
            <ol className="mt-3 grid gap-2">
              {enabled.map((candidate, index) => (
                <CandidateRow
                  candidate={candidate}
                  isFirst={index === 0}
                  isLast={index === enabled.length - 1}
                  key={candidate.profileId}
                  onCommand={onCommand}
                  pending={pending}
                />
              ))}
            </ol>
          )}
        </section>

        <section aria-label={`${copy.title} — disponíveis`}>
          <h2 className="text-sm font-semibold">Disponíveis</h2>
          <Input
            aria-label={copy.searchLabel}
            className="mt-3"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={copy.searchLabel}
            type="search"
            value={search}
          />
          {available.length === 0 ? (
            <p className="text-muted-foreground mt-2 text-sm">
              {availableEmptyMessage}
            </p>
          ) : (
            <ul className="mt-3 grid max-h-[28rem] gap-2 overflow-y-auto">
              {available.map((candidate) => (
                <CandidateRow
                  candidate={candidate}
                  key={candidate.profileId}
                  onCommand={onCommand}
                  pending={pending}
                />
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

export function LandingShowcaseManagementView({
  data,
  hasError,
  isLoading,
  onCommand,
  pending,
}: {
  data: LandingShowcaseManagementResponseDto | undefined;
  hasError: boolean;
  isLoading: boolean;
  onCommand: CommandHandler;
  pending: boolean;
}) {
  return (
    <div className="grid gap-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <LayoutTemplate aria-hidden="true" className="size-6" />
          Gestão da landing
        </h1>
        <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
          Escolha quais creators e empresas aprovados passam no carrossel
          “Creators e marcas em destaque” da página inicial, e em que ordem. A
          página pública pode levar alguns minutos para refletir as mudanças.
        </p>
      </header>

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      ) : hasError || !data ? (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível carregar os perfis.</AlertTitle>
          <AlertDescription>
            Atualize a página para tentar novamente.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <KindPanel
            candidates={data.creators}
            kind="CREATOR"
            onCommand={onCommand}
            pending={pending}
          />
          <KindPanel
            candidates={data.companies}
            kind="COMPANY"
            onCommand={onCommand}
            pending={pending}
          />
        </div>
      )}
    </div>
  );
}

export function LandingShowcaseManagementScreen() {
  const query = useLandingShowcaseCandidates();
  const command = useLandingShowcaseCommand();

  async function handleCommand(input: LandingShowcaseCommand) {
    try {
      await command.mutateAsync(input);
      toast.success(successMessages[input.action]);
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível concluir a operação agora.",
      );
    }
  }

  return (
    <LandingShowcaseManagementView
      data={query.data}
      hasError={query.isError}
      isLoading={query.isPending}
      onCommand={handleCommand}
      pending={command.isPending}
    />
  );
}

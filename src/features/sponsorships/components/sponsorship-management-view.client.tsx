"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertCircle,
  Archive,
  ChevronLeft,
  ChevronRight,
  CircleOff,
  Eye,
  GripVertical,
  Megaphone,
  Power,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { type MediaUploadActions } from "@/features/media";
import { ActionSubmitButton } from "@/shared/components/action-submit-button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldLabel,
  RequiredFieldsNotice,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { SearchableSelect } from "@/shared/components/ui/searchable-select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/shared/lib/cn";

import {
  type SponsorshipAdminPlacementDto,
  type SponsorshipManagementFilters,
  type SponsorshipManagementResponseDto,
  type SponsorshipPlacementCommand,
  type SponsorshipPlacementWriteInput,
} from "../api/sponsorship-management.contract";
import { serializeSponsorshipManagementFilters } from "../api/sponsorship-management.contract";
import {
  useSponsorshipManagement,
  useSponsorshipPlacementMutations,
} from "../hooks/use-sponsorship-management";
import { PlacementLivePreview } from "./placement-live-preview.client";
import { formDefaults } from "../schemas/placement-form.schema";
import { PlacementFormDialog } from "./placement-form-dialog.client";
import {
  placementTypeLabels as typeLabels,
  getPlacementSlot,
} from "../domain/placement-slot-catalog";

type SponsorshipViewQuery =
  | {
      data?: undefined;
      retry?: () => void;
      status: "error" | "loading";
    }
  | {
      data: SponsorshipManagementResponseDto;
      retry?: () => void;
      status: "success";
    };

interface SponsorshipMutationCallbacks {
  command(
    placementId: string,
    input: SponsorshipPlacementCommand,
  ): Promise<unknown>;
  create(input: SponsorshipPlacementWriteInput): Promise<unknown>;
  update(
    placementId: string,
    input: SponsorshipPlacementWriteInput,
  ): Promise<unknown>;
}

const audienceLabels = {
  ALL: "Todos os aprovados",
  COMPANY: "Empresas aprovadas",
  INFLUENCER: "Influenciadores aprovados",
} as const;

const stateLabels = {
  ACTIVE: "Ativo",
  ARCHIVED: "Arquivado",
  DRAFT: "Rascunho",
  EXPIRED: "Expirado",
  SCHEDULED: "Agendado",
} as const;

function placementStateVariant(state: SponsorshipAdminPlacementDto["state"]) {
  if (state === "ACTIVE") return "default";
  if (state === "ARCHIVED" || state === "EXPIRED") return "secondary";
  return "outline";
}

function PlacementPreview({
  placement,
}: {
  placement: SponsorshipAdminPlacementDto;
}) {
  return (
    <PlacementLivePreview
      values={formDefaults(placement)}
      images={{
        desktop: placement.creative?.url ?? null,
        tablet: placement.creativeTablet?.url ?? null,
        mobile: placement.creativeMobile?.url ?? null,
      }}
      creator={
        placement.featuredCreatorProfileId
          ? {
              id: placement.featuredCreatorProfileId,
              displayName:
                placement.featuredCreatorName ?? "Criador em destaque",
              avatarUrl: null,
              location: null,
            }
          : null
      }
    />
  );
}

function PlacementPreviewDialog({
  placement,
}: {
  placement: SponsorshipAdminPlacementDto;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            className="min-h-11"
            size="sm"
            type="button"
            variant="outline"
          >
            <Eye aria-hidden="true" />
            Visualizar
          </Button>
        }
      />
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Prévia do patrocínio</DialogTitle>
          <DialogDescription>
            A prévia não altera a ativação nem publica o criativo.
          </DialogDescription>
        </DialogHeader>
        <PlacementPreview placement={placement} />
      </DialogContent>
    </Dialog>
  );
}

function PlacementCommandDialog({
  action,
  label,
  placement,
  run,
  variant = "outline",
}: {
  action: "ACTIVATE" | "ARCHIVE" | "DEACTIVATE";
  label: string;
  placement: SponsorshipAdminPlacementDto;
  run: SponsorshipMutationCallbacks["command"];
  variant?: "destructive" | "outline";
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 8) {
      setError("Explique o motivo em pelo menos 8 caracteres.");
      return;
    }

    try {
      setPending(true);
      setError(null);
      await run(placement.id, {
        action,
        expectedVersion: placement.version,
        reason: reason.trim(),
      });
      toast.success(`${label} concluído`, {
        description:
          "A operação foi aplicada e registrada no histórico de auditoria.",
      });
      setOpen(false);
      setReason("");
    } catch {
      setError(
        "A operação não foi concluída. O patrocínio pode ter sido alterado; atualize e tente novamente.",
      );
    } finally {
      setPending(false);
    }
  }

  const Icon =
    action === "ACTIVATE"
      ? Power
      : action === "DEACTIVATE"
        ? CircleOff
        : Archive;

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        render={
          <Button
            className="min-h-11"
            size="sm"
            type="button"
            variant={variant}
          >
            <Icon aria-hidden="true" />
            {label}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            Esta operação valida a versão atual e registra o motivo na
            auditoria.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={submit}>
          <RequiredFieldsNotice />
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor={`${placement.id}-${action}-reason`} required>
              Motivo da operação
            </FieldLabel>
            <Textarea
              aria-invalid={Boolean(error)}
              id={`${placement.id}-${action}-reason`}
              onChange={(event) => setReason(event.target.value)}
              required
              rows={3}
              value={reason}
            />
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
          {action === "ACTIVATE" && placement.activationIssues.length ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertTitle>O criativo ainda não pode ser ativado</AlertTitle>
              <AlertDescription>
                {placement.activationIssues.join(" ")}
              </AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter showCloseButton>
            <ActionSubmitButton
              disabled={
                action === "ACTIVATE" && placement.activationIssues.length > 0
              }
              pending={pending}
              pendingLabel="Aplicando operação..."
              variant={variant}
            >
              {`Confirmar: ${label.toLowerCase()}`}
            </ActionSubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PlacementActions({
  mediaActions,
  mutations,
  placement,
}: {
  mediaActions: MediaUploadActions;
  mutations: SponsorshipMutationCallbacks;
  placement: SponsorshipAdminPlacementDto;
}) {
  if (placement.archivedAt) {
    return null;
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap [&_[data-slot=button]]:min-h-10 [&_[data-slot=button]]:w-full [&_[data-slot=button]]:px-2 [&_[data-slot=button]]:text-xs sm:[&_[data-slot=button]]:min-h-11 sm:[&_[data-slot=button]]:w-auto sm:[&_[data-slot=button]]:px-3 sm:[&_[data-slot=button]]:text-[0.8rem]">
      <PlacementPreviewDialog placement={placement} />
      <PlacementFormDialog
        mediaActions={mediaActions}
        mutation={mutations}
        placement={placement}
      />
      <PlacementCommandDialog
        action={placement.isActive ? "DEACTIVATE" : "ACTIVATE"}
        label={placement.isActive ? "Desativar" : "Ativar"}
        placement={placement}
        run={mutations.command}
      />
      <PlacementCommandDialog
        action="ARCHIVE"
        label="Arquivar"
        placement={placement}
        run={mutations.command}
        variant="destructive"
      />
    </div>
  );
}

function DragHandle({
  attributes,
  disabled,
  listeners,
}: {
  attributes: ReturnType<typeof useSortable>["attributes"];
  disabled?: boolean;
  listeners: ReturnType<typeof useSortable>["listeners"];
}) {
  if (disabled) {
    return <span className="block size-4" />;
  }

  return (
    <button
      aria-label="Arrastar para reordenar"
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring cursor-grab touch-none rounded outline-none focus-visible:ring-2 active:cursor-grabbing"
      type="button"
      {...attributes}
      {...listeners}
    >
      <GripVertical aria-hidden="true" className="size-4" />
    </button>
  );
}

function SortablePlacementRow({
  mediaActions,
  mutations,
  placement,
}: {
  mediaActions: MediaUploadActions;
  mutations: SponsorshipMutationCallbacks;
  placement: SponsorshipAdminPlacementDto;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    disabled: Boolean(placement.archivedAt),
    id: placement.id,
  });

  return (
    <TableRow
      className={isDragging ? "bg-card relative z-10 shadow-lg" : undefined}
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <TableCell>
        <DragHandle
          attributes={attributes}
          disabled={Boolean(placement.archivedAt)}
          listeners={listeners}
        />
      </TableCell>
      <TableCell className="max-w-xs">
        <p className="font-semibold">{placement.title ?? "Sem título"}</p>
        <p className="text-muted-foreground text-sm">
          {typeLabels[placement.placementType]} ·{" "}
          {getPlacementSlot(placement.slotKey)?.name ?? placement.slotKey}
        </p>
      </TableCell>
      <TableCell>{audienceLabels[placement.audience]}</TableCell>
      <TableCell>
        <p className="text-muted-foreground text-xs">
          {placement.startsAt
            ? new Date(placement.startsAt).toLocaleString("pt-BR")
            : "Sem início definido"}
        </p>
      </TableCell>
      <TableCell>
        <Badge variant={placementStateVariant(placement.state)}>
          {stateLabels[placement.state]}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex justify-end">
          <PlacementActions
            mediaActions={mediaActions}
            mutations={mutations}
            placement={placement}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

function SortablePlacementCard({
  mediaActions,
  mutations,
  placement,
}: {
  mediaActions: MediaUploadActions;
  mutations: SponsorshipMutationCallbacks;
  placement: SponsorshipAdminPlacementDto;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    disabled: Boolean(placement.archivedAt),
    id: placement.id,
  });

  return (
    <Card
      className={cn(
        "rounded-2xl [--card-spacing:--spacing(4)]",
        isDragging && "relative z-10 shadow-lg",
      )}
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <DragHandle
              attributes={attributes}
              disabled={Boolean(placement.archivedAt)}
              listeners={listeners}
            />
            <Badge variant={placementStateVariant(placement.state)}>
              {stateLabels[placement.state]}
            </Badge>
          </div>
        </div>
        <CardTitle className="text-lg">
          {placement.title ?? "Sem título"}
        </CardTitle>
        <CardDescription className="text-base leading-6">
          {typeLabels[placement.placementType]} ·{" "}
          {audienceLabels[placement.audience]}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-1">
        <p className="line-clamp-3 text-sm leading-6">
          {placement.body ?? "Sem texto de apoio."}
        </p>
        <PlacementActions
          mediaActions={mediaActions}
          mutations={mutations}
          placement={placement}
        />
      </CardContent>
    </Card>
  );
}

function PlacementList({
  data,
  mediaActions,
  mutations,
  onPageChange,
}: {
  data: SponsorshipManagementResponseDto;
  mediaActions: MediaUploadActions;
  mutations: SponsorshipMutationCallbacks;
  onPageChange: (page: number) => void;
}) {
  const [items, setItems] = useState(data.items);
  const [syncedFrom, setSyncedFrom] = useState(data.items);
  if (data.items !== syncedFrom) {
    setSyncedFrom(data.items);
    setItems(data.items);
  }
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const canReorder = data.pagination.totalPages <= 1;

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reordered = arrayMove(items, oldIndex, newIndex);
    const previous = items;
    setItems(reordered);

    const changes = reordered
      .map((item, index) => ({ item, sortOrder: index * 10 }))
      .filter(({ item, sortOrder }) => item.sortOrder !== sortOrder);

    try {
      await Promise.all(
        changes.map(({ item, sortOrder }) =>
          mutations.command(item.id, {
            action: "REORDER",
            expectedVersion: item.version,
            reason: "Reordenado por arrastar e soltar no backoffice.",
            sortOrder,
          }),
        ),
      );
    } catch {
      setItems(previous);
      toast.error("Não foi possível salvar a nova ordem", {
        description: "Atualize a página e tente novamente.",
      });
    }
  }

  if (!items.length) {
    return (
      <Card>
        <CardContent className="flex min-h-44 flex-col items-center justify-center gap-2 text-center">
          <Megaphone aria-hidden="true" className="text-brand-blue size-8" />
          <p className="font-bold">Nenhum patrocínio encontrado</p>
          <p className="text-muted-foreground text-sm">
            Ajuste os filtros ou crie o primeiro placement.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      sensors={canReorder ? sensors : []}
    >
      <p aria-live="polite" className="sr-only">
        {data.pagination.totalItems}{" "}
        {data.pagination.totalItems === 1
          ? "patrocínio encontrado"
          : "patrocínios encontrados"}
      </p>
      {!canReorder ? (
        <p className="text-muted-foreground text-sm">
          A reordenação por arrastar e soltar fica disponível quando todos os
          resultados cabem em uma página.
        </p>
      ) : null}
      <Card className="hidden overflow-hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <span className="sr-only">Reordenar</span>
              </TableHead>
              <TableHead>Patrocínio</TableHead>
              <TableHead>Audiência</TableHead>
              <TableHead>Agenda</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <SortableContext
              items={items.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((placement) => (
                <SortablePlacementRow
                  key={placement.id}
                  mediaActions={mediaActions}
                  mutations={mutations}
                  placement={placement}
                />
              ))}
            </SortableContext>
          </TableBody>
        </Table>
      </Card>

      <div className="grid gap-4 md:hidden">
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((placement) => (
            <SortablePlacementCard
              key={placement.id}
              mediaActions={mediaActions}
              mutations={mutations}
              placement={placement}
            />
          ))}
        </SortableContext>
      </div>

      {data.pagination.totalPages > 1 ? (
        <nav
          aria-label="Paginação dos patrocínios"
          className="flex flex-col items-center justify-between gap-3 sm:flex-row"
        >
          <p className="text-muted-foreground text-sm">
            Página {data.pagination.page} de {data.pagination.totalPages}
          </p>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              className="min-h-11 flex-1 sm:flex-none"
              disabled={data.pagination.page <= 1}
              onClick={() => onPageChange(data.pagination.page - 1)}
              type="button"
              variant="outline"
            >
              <ChevronLeft aria-hidden="true" />
              Página anterior
            </Button>
            <Button
              className="min-h-11 flex-1 sm:flex-none"
              disabled={data.pagination.page >= data.pagination.totalPages}
              onClick={() => onPageChange(data.pagination.page + 1)}
              type="button"
              variant="outline"
            >
              Próxima página
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </nav>
      ) : null}
    </DndContext>
  );
}

export function SponsorshipManagementView({
  filters,
  mediaActions,
  mutations,
  onFiltersChange,
  query,
}: {
  filters: SponsorshipManagementFilters;
  mediaActions: MediaUploadActions;
  mutations: SponsorshipMutationCallbacks;
  onFiltersChange: (filters: SponsorshipManagementFilters) => void;
  query: SponsorshipViewQuery;
}) {
  const [searchDraft, setSearchDraft] = useState({
    canonical: filters.search,
    value: filters.search,
  });
  const search =
    searchDraft.canonical === filters.search
      ? searchDraft.value
      : filters.search;

  function update(patch: Partial<SponsorshipManagementFilters>) {
    onFiltersChange({
      ...filters,
      ...patch,
      page: 1,
    });
  }

  return (
    <div aria-busy={query.status === "loading"} className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-brand-blue text-sm font-bold">
            Conteúdo promocional
          </p>
          <h1 className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
            Patrocínios
          </h1>
          <p className="text-muted-foreground max-w-2xl leading-7">
            Gerencie criativos, audiência, agenda e ordem sem registrar preços,
            pagamentos, comissões ou renovação.
          </p>
        </div>
        <PlacementFormDialog mediaActions={mediaActions} mutation={mutations} />
      </div>

      <Card>
        <CardContent className="pt-1">
          <form
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1fr)_13rem_13rem_13rem_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              update({ search: search.trim() });
            }}
            role="search"
          >
            <Field className="sm:col-span-2 xl:col-span-1">
              <FieldLabel htmlFor="sponsorship-search">
                Buscar patrocínio
              </FieldLabel>
              <Input
                id="sponsorship-search"
                onChange={(event) =>
                  setSearchDraft({
                    canonical: filters.search,
                    value: event.target.value,
                  })
                }
                placeholder="Título, anunciante ou posição"
                type="search"
                value={search}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="sponsorship-filter-type">Tipo</FieldLabel>
              <SearchableSelect
                id="sponsorship-filter-type"
                items={{ ALL: "Todos os tipos", ...typeLabels }}
                onValueChange={(value) =>
                  update({
                    type:
                      value && value !== "ALL"
                        ? (value as SponsorshipManagementFilters["type"])
                        : undefined,
                  })
                }
                value={filters.type ?? "ALL"}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="sponsorship-filter-audience">
                Audiência
              </FieldLabel>
              <SearchableSelect
                id="sponsorship-filter-audience"
                items={{ ALL_FILTER: "Todas as audiências", ...audienceLabels }}
                onValueChange={(value) =>
                  update({
                    audience:
                      value && value !== "ALL_FILTER"
                        ? (value as SponsorshipManagementFilters["audience"])
                        : undefined,
                  })
                }
                value={filters.audience ?? "ALL_FILTER"}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="sponsorship-filter-state">Status</FieldLabel>
              <SearchableSelect
                id="sponsorship-filter-state"
                items={{ ALL: "Todos os status", ...stateLabels }}
                onValueChange={(value) =>
                  update({
                    state:
                      value && value !== "ALL"
                        ? (value as SponsorshipManagementFilters["state"])
                        : undefined,
                  })
                }
                value={filters.state ?? "ALL"}
              />
            </Field>
            <div className="grid grid-cols-[minmax(0,1fr)_3rem] gap-2 self-end">
              <Button
                className="min-h-12 w-full"
                type="submit"
                variant="outline"
              >
                <Search aria-hidden="true" />
                Buscar
              </Button>
              <Button
                aria-label="Limpar filtros"
                className="min-h-12 w-12 px-0"
                onClick={() => {
                  setSearchDraft({
                    canonical: filters.search,
                    value: "",
                  });
                  onFiltersChange({
                    page: 1,
                    pageSize: filters.pageSize,
                    search: "",
                  });
                }}
                type="button"
                variant="ghost"
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {query.status === "loading" ? (
        <div aria-live="polite" className="space-y-3" role="status">
          <span className="sr-only">Carregando patrocínios</span>
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : null}

      {query.status === "error" ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Não foi possível carregar os patrocínios</AlertTitle>
          <AlertDescription>
            Tente novamente. Se o problema continuar, confirme sua sessão
            administrativa.
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
        <PlacementList
          data={query.data}
          mediaActions={mediaActions}
          mutations={mutations}
          onPageChange={(page) =>
            onFiltersChange({
              ...filters,
              page,
            })
          }
        />
      ) : null}
    </div>
  );
}

export function SponsorshipManagementScreen({
  filters,
  mediaActions,
}: {
  filters: SponsorshipManagementFilters;
  mediaActions: MediaUploadActions;
}) {
  const router = useRouter();
  const query = useSponsorshipManagement(filters);
  const mutations = useSponsorshipPlacementMutations();
  const mutationCallbacks = useMemo<SponsorshipMutationCallbacks>(
    () => ({
      command: (placementId, input) =>
        mutations.command.mutateAsync({ input, placementId }),
      create: (input) => mutations.create.mutateAsync(input),
      update: (placementId, input) =>
        mutations.update.mutateAsync({ input, placementId }),
    }),
    [mutations.command, mutations.create, mutations.update],
  );

  return (
    <SponsorshipManagementView
      filters={filters}
      mediaActions={mediaActions}
      mutations={mutationCallbacks}
      onFiltersChange={(nextFilters) => {
        const searchParams = serializeSponsorshipManagementFilters(nextFilters);
        router.replace(`/backoffice/sponsorships?${searchParams.toString()}`, {
          scroll: false,
        });
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

export type { SponsorshipMutationCallbacks };

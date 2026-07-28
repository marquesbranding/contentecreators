"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Archive,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  CircleOff,
  Eye,
  Megaphone,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { MediaUploadField, type MediaUploadActions } from "@/features/media";
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
  FieldDescription,
  FieldError,
  FieldLabel,
  RequiredFieldsNotice,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
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

import {
  sponsorshipAudienceSchema,
  sponsorshipPlacementTypeSchema,
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
import { safeSponsorshipLinkSchema } from "../schemas/sponsorship-placement.schema";

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

const placementFormSchema = z
  .object({
    advertiserLabel: z.string().trim().max(160),
    audience: sponsorshipAudienceSchema,
    body: z.string().trim().max(500),
    creativeAssetId: z.string(),
    endsAt: z.string(),
    featuredCreatorProfileId: z.string(),
    linkLabel: z.string().trim().max(80),
    linkUrl: z.union([z.literal(""), safeSponsorshipLinkSchema]),
    placementType: sponsorshipPlacementTypeSchema,
    reason: z.string().trim().min(1, "Campo obrigatório.").min(8, {
      message: "Explique o motivo em pelo menos 8 caracteres.",
    }),
    slotKey: z
      .string()
      .trim()
      .min(1, "Campo obrigatório.")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, {
        message: "Use letras minúsculas, números e hífens.",
      }),
    sortOrder: z.coerce.number().int("Informe um número inteiro."),
    startsAt: z.string(),
    title: z.string().trim().min(1, "Campo obrigatório.").max(160),
  })
  .superRefine((values, context) => {
    if (
      values.placementType === "FEATURED_CREATOR" &&
      !z.uuid().safeParse(values.featuredCreatorProfileId).success
    ) {
      context.addIssue({
        code: "custom",
        message: "Selecione um criador elegível.",
        path: ["featuredCreatorProfileId"],
      });
    }

    if (
      values.creativeAssetId &&
      !z.uuid().safeParse(values.creativeAssetId).success
    ) {
      context.addIssue({
        code: "custom",
        message: "A mídia selecionada é inválida.",
        path: ["creativeAssetId"],
      });
    }

    if (
      values.startsAt &&
      values.endsAt &&
      new Date(values.endsAt) <= new Date(values.startsAt)
    ) {
      context.addIssue({
        code: "custom",
        message: "O término deve ser posterior ao início.",
        path: ["endsAt"],
      });
    }
  });

type PlacementFormValues = z.input<typeof placementFormSchema>;

const typeLabels = {
  CAROUSEL: "Carrossel",
  FEATURED_CREATOR: "Criador em destaque",
  INLINE_BANNER: "Banner lateral / inline",
  TOP_BANNER: "Banner de topo",
} as const;

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

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );

  return localDate.toISOString().slice(0, 16);
}

function nullable(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function formDefaults(
  placement?: SponsorshipAdminPlacementDto,
): PlacementFormValues {
  return {
    advertiserLabel: placement?.advertiserLabel ?? "",
    audience: placement?.audience ?? "ALL",
    body: placement?.body ?? "",
    creativeAssetId: placement?.creativeAssetId ?? "",
    endsAt: toDateTimeLocal(placement?.endsAt ?? null),
    featuredCreatorProfileId: placement?.featuredCreatorProfileId ?? "",
    linkLabel: placement?.linkLabel ?? "",
    linkUrl: placement?.linkUrl ?? "",
    placementType: placement?.placementType ?? "TOP_BANNER",
    reason: "",
    slotKey: placement?.slotKey ?? "catalog-top",
    sortOrder: placement?.sortOrder ?? 0,
    startsAt: toDateTimeLocal(placement?.startsAt ?? null),
    title: placement?.title ?? "",
  };
}

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
    <Card className="border-brand-blue/30 bg-brand-blue-soft overflow-hidden">
      {placement.creative ? (
        // The service returns a short-lived signed URL, not a Storage path.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={placement.creative.alt}
          className="aspect-video w-full object-cover"
          src={placement.creative.url}
        />
      ) : null}
      <CardHeader>
        <Badge className="w-fit" variant="outline">
          Somente prévia administrativa
        </Badge>
        <CardTitle>{placement.title ?? "Criativo sem título"}</CardTitle>
        <CardDescription>
          {placement.body ?? "Nenhum texto de apoio informado."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-muted-foreground text-sm">
          {typeLabels[placement.placementType]} ·{" "}
          {audienceLabels[placement.audience]}
        </span>
        {placement.linkUrl ? (
          <Button
            render={
              <a
                href={placement.linkUrl}
                rel="noopener noreferrer"
                target="_blank"
              />
            }
            variant="outline"
          >
            {placement.linkLabel ?? "Abrir link"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Prévia do placement</DialogTitle>
          <DialogDescription>
            A prévia não altera a ativação nem publica o criativo.
          </DialogDescription>
        </DialogHeader>
        <PlacementPreview placement={placement} />
      </DialogContent>
    </Dialog>
  );
}

function PlacementFormDialog({
  mediaActions,
  mutation,
  placement,
}: {
  mediaActions: MediaUploadActions;
  mutation: SponsorshipMutationCallbacks;
  placement?: SponsorshipAdminPlacementDto;
}) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<PlacementFormValues>({
    defaultValues: formDefaults(placement),
    resolver: zodResolver(placementFormSchema),
  });
  const placementType = useWatch({
    control: form.control,
    name: "placementType",
  });

  async function onSubmit(input: PlacementFormValues) {
    const values = placementFormSchema.parse(input);
    const command: SponsorshipPlacementWriteInput = {
      advertiserLabel: nullable(values.advertiserLabel),
      audience: values.audience,
      body: nullable(values.body),
      creativeAssetId: nullable(values.creativeAssetId),
      endsAt: toIso(values.endsAt),
      expectedVersion: placement?.version,
      featuredCreatorProfileId: nullable(values.featuredCreatorProfileId),
      isActive: false,
      linkLabel: nullable(values.linkLabel),
      linkUrl: nullable(values.linkUrl),
      placementType: values.placementType,
      reason: values.reason,
      slotKey: values.slotKey,
      sortOrder: Number(values.sortOrder),
      startsAt: toIso(values.startsAt),
      title: values.title,
    };

    try {
      setSubmitError(null);
      if (placement) {
        await mutation.update(placement.id, command);
      } else {
        await mutation.create(command);
      }
      setOpen(false);
      form.reset(formDefaults());
    } catch {
      setSubmitError(
        "Não foi possível salvar. Atualize os dados e tente novamente.",
      );
    }
  }

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          form.reset(formDefaults(placement));
          setSubmitError(null);
        }
      }}
      open={open}
    >
      <DialogTrigger
        render={
          <Button
            className="min-h-11"
            size={placement ? "sm" : "default"}
            type="button"
            variant={placement ? "outline" : "default"}
          >
            {placement ? (
              <Pencil aria-hidden="true" />
            ) : (
              <Plus aria-hidden="true" />
            )}
            {placement ? "Editar" : "Novo patrocínio"}
          </Button>
        }
      />
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {placement ? "Editar patrocínio" : "Novo patrocínio"}
          </DialogTitle>
          <DialogDescription>
            Salve o conteúdo como rascunho. A ativação é uma ação separada e
            valida agenda, mídia, audiência e privacidade.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-5"
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <RequiredFieldsNotice />

          <div className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={Boolean(form.formState.errors.placementType)}>
              <FieldLabel htmlFor="sponsorship-placement-type" required>
                Tipo
              </FieldLabel>
              <Controller
                control={form.control}
                name="placementType"
                render={({ field }) => (
                  <Select
                    items={typeLabels}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <SelectTrigger
                      aria-required="true"
                      aria-invalid={Boolean(
                        form.formState.errors.placementType,
                      )}
                      id="sponsorship-placement-type"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[form.formState.errors.placementType]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.audience)}>
              <FieldLabel htmlFor="sponsorship-placement-audience" required>
                Audiência
              </FieldLabel>
              <Controller
                control={form.control}
                name="audience"
                render={({ field }) => (
                  <Select
                    items={audienceLabels}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <SelectTrigger
                      aria-required="true"
                      aria-invalid={Boolean(form.formState.errors.audience)}
                      id="sponsorship-placement-audience"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(audienceLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[form.formState.errors.audience]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.slotKey)}>
              <FieldLabel htmlFor="sponsorship-slot-key" required>
                Posição
              </FieldLabel>
              <Input
                aria-invalid={Boolean(form.formState.errors.slotKey)}
                id="sponsorship-slot-key"
                required
                {...form.register("slotKey")}
              />
              <FieldDescription>
                Identificador técnico, por exemplo `catalog-top`.
              </FieldDescription>
              <FieldError errors={[form.formState.errors.slotKey]} />
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.sortOrder)}>
              <FieldLabel htmlFor="sponsorship-sort-order" required>
                Ordem
              </FieldLabel>
              <Input
                aria-invalid={Boolean(form.formState.errors.sortOrder)}
                id="sponsorship-sort-order"
                inputMode="numeric"
                required
                type="number"
                {...form.register("sortOrder")}
              />
              <FieldError errors={[form.formState.errors.sortOrder]} />
            </Field>
          </div>

          <Field data-invalid={Boolean(form.formState.errors.title)}>
            <FieldLabel htmlFor="sponsorship-title" required>
              Título
            </FieldLabel>
            <Input
              aria-invalid={Boolean(form.formState.errors.title)}
              id="sponsorship-title"
              required
              {...form.register("title")}
            />
            <FieldError errors={[form.formState.errors.title]} />
          </Field>

          <Field data-invalid={Boolean(form.formState.errors.body)}>
            <FieldLabel htmlFor="sponsorship-body">Texto (opcional)</FieldLabel>
            <Textarea
              aria-invalid={Boolean(form.formState.errors.body)}
              id="sponsorship-body"
              rows={4}
              {...form.register("body")}
            />
            <FieldError errors={[form.formState.errors.body]} />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={Boolean(form.formState.errors.linkUrl)}>
              <FieldLabel htmlFor="sponsorship-link">
                Link HTTP(S) (opcional)
              </FieldLabel>
              <Input
                aria-invalid={Boolean(form.formState.errors.linkUrl)}
                id="sponsorship-link"
                inputMode="url"
                placeholder="https://"
                {...form.register("linkUrl")}
              />
              <FieldError errors={[form.formState.errors.linkUrl]} />
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.linkLabel)}>
              <FieldLabel htmlFor="sponsorship-link-label">
                Texto do link (opcional)
              </FieldLabel>
              <Input
                aria-invalid={Boolean(form.formState.errors.linkLabel)}
                id="sponsorship-link-label"
                {...form.register("linkLabel")}
              />
              <FieldError errors={[form.formState.errors.linkLabel]} />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={Boolean(form.formState.errors.startsAt)}>
              <FieldLabel htmlFor="sponsorship-start">
                Início (opcional)
              </FieldLabel>
              <Input
                aria-invalid={Boolean(form.formState.errors.startsAt)}
                id="sponsorship-start"
                type="datetime-local"
                {...form.register("startsAt")}
              />
              <FieldDescription>
                O servidor armazena e avalia a agenda em UTC.
              </FieldDescription>
              <FieldError errors={[form.formState.errors.startsAt]} />
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.endsAt)}>
              <FieldLabel htmlFor="sponsorship-end">
                Término (opcional)
              </FieldLabel>
              <Input
                aria-invalid={Boolean(form.formState.errors.endsAt)}
                id="sponsorship-end"
                type="datetime-local"
                {...form.register("endsAt")}
              />
              <FieldError errors={[form.formState.errors.endsAt]} />
            </Field>
          </div>

          <Field data-invalid={Boolean(form.formState.errors.advertiserLabel)}>
            <FieldLabel htmlFor="sponsorship-advertiser">
              Identificação do anunciante (opcional)
            </FieldLabel>
            <Input
              aria-invalid={Boolean(form.formState.errors.advertiserLabel)}
              id="sponsorship-advertiser"
              {...form.register("advertiserLabel")}
            />
          </Field>

          {placementType === "FEATURED_CREATOR" ? (
            <Field
              data-invalid={Boolean(
                form.formState.errors.featuredCreatorProfileId,
              )}
            >
              <FieldLabel htmlFor="sponsorship-featured-creator" required>
                ID do perfil do criador
              </FieldLabel>
              <Input
                aria-invalid={Boolean(
                  form.formState.errors.featuredCreatorProfileId,
                )}
                id="sponsorship-featured-creator"
                required
                {...form.register("featuredCreatorProfileId")}
              />
              <FieldDescription>
                A ativação confirma se o perfil continua aprovado e elegível.
              </FieldDescription>
              <FieldError
                errors={[form.formState.errors.featuredCreatorProfileId]}
              />
            </Field>
          ) : null}

          <MediaUploadField
            actions={mediaActions}
            activateOnUpload={false}
            currentAssetId={placement?.creativeAssetId ?? null}
            label="Imagem do criativo (opcional no rascunho)"
            onComplete={(assetId) =>
              form.setValue("creativeAssetId", assetId, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            purpose="SPONSORSHIP_CREATIVE"
          />

          <Field data-invalid={Boolean(form.formState.errors.reason)}>
            <FieldLabel htmlFor="sponsorship-reason" required>
              Motivo da alteração
            </FieldLabel>
            <Textarea
              aria-invalid={Boolean(form.formState.errors.reason)}
              id="sponsorship-reason"
              required
              rows={3}
              {...form.register("reason")}
            />
            <FieldDescription>
              O motivo será registrado no histórico de auditoria.
            </FieldDescription>
            <FieldError errors={[form.formState.errors.reason]} />
          </Field>

          {submitError ? (
            <Alert role="alert" variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertTitle>Não foi possível salvar</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter showCloseButton>
            <Button disabled={form.formState.isSubmitting} type="submit">
              {form.formState.isSubmitting
                ? "Salvando..."
                : placement
                  ? "Salvar alterações"
                  : "Salvar rascunho"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PlacementCommandDialog({
  action,
  label,
  placement,
  run,
  sortOrder,
  variant = "outline",
}: {
  action: SponsorshipPlacementCommand["action"];
  label: string;
  placement: SponsorshipAdminPlacementDto;
  run: SponsorshipMutationCallbacks["command"];
  sortOrder?: number;
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
        sortOrder,
      });
      setOpen(false);
      setReason("");
    } catch {
      setError(
        "A operação não foi concluída. O placement pode ter sido alterado; atualize e tente novamente.",
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
        : action === "ARCHIVE"
          ? Archive
          : sortOrder && sortOrder < placement.sortOrder
            ? ArrowUp
            : ArrowDown;

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
            <Button
              disabled={
                pending ||
                (action === "ACTIVATE" && placement.activationIssues.length > 0)
              }
              type="submit"
              variant={variant}
            >
              {pending ? "Processando..." : `Confirmar: ${label.toLowerCase()}`}
            </Button>
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
    <div className="flex flex-wrap gap-2">
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
        action="REORDER"
        label="Subir"
        placement={placement}
        run={mutations.command}
        sortOrder={placement.sortOrder - 10}
      />
      <PlacementCommandDialog
        action="REORDER"
        label="Descer"
        placement={placement}
        run={mutations.command}
        sortOrder={placement.sortOrder + 10}
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
  if (!data.items.length) {
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
    <>
      <p aria-live="polite" className="sr-only">
        {data.pagination.totalItems}{" "}
        {data.pagination.totalItems === 1
          ? "patrocínio encontrado"
          : "patrocínios encontrados"}
      </p>
      <Card className="hidden overflow-hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Placement</TableHead>
              <TableHead>Audiência</TableHead>
              <TableHead>Agenda e ordem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((placement) => (
              <TableRow key={placement.id}>
                <TableCell className="max-w-xs">
                  <p className="font-semibold">
                    {placement.title ?? "Sem título"}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {typeLabels[placement.placementType]} · {placement.slotKey}
                  </p>
                </TableCell>
                <TableCell>{audienceLabels[placement.audience]}</TableCell>
                <TableCell>
                  <p>Ordem {placement.sortOrder}</p>
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
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid gap-4 md:hidden">
        {data.items.map((placement) => (
          <Card key={placement.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant={placementStateVariant(placement.state)}>
                  {stateLabels[placement.state]}
                </Badge>
                <span className="text-muted-foreground text-xs">
                  Ordem {placement.sortOrder}
                </span>
              </div>
              <CardTitle>{placement.title ?? "Sem título"}</CardTitle>
              <CardDescription>
                {typeLabels[placement.placementType]} ·{" "}
                {audienceLabels[placement.audience]}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6">
                {placement.body ?? "Sem texto de apoio."}
              </p>
              <PlacementActions
                mediaActions={mediaActions}
                mutations={mutations}
                placement={placement}
              />
            </CardContent>
          </Card>
        ))}
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
    </>
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
                className="h-11"
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
              <Select
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
              >
                <SelectTrigger className="h-11" id="sponsorship-filter-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os tipos</SelectItem>
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="sponsorship-filter-audience">
                Audiência
              </FieldLabel>
              <Select
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
              >
                <SelectTrigger
                  className="h-11"
                  id="sponsorship-filter-audience"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_FILTER">
                    Todas as audiências
                  </SelectItem>
                  {Object.entries(audienceLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="sponsorship-filter-state">Status</FieldLabel>
              <Select
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
              >
                <SelectTrigger className="h-11" id="sponsorship-filter-state">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os status</SelectItem>
                  {Object.entries(stateLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex gap-2 self-end">
              <Button
                className="min-h-11 flex-1"
                type="submit"
                variant="outline"
              >
                <Search aria-hidden="true" />
                Buscar
              </Button>
              <Button
                aria-label="Limpar filtros"
                className="min-h-11"
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

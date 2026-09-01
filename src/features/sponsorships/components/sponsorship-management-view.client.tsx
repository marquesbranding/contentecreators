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
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Archive,
  Camera,
  ChevronLeft,
  ChevronRight,
  CircleOff,
  Eye,
  GripVertical,
  Megaphone,
  Monitor,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  Search,
  Smartphone,
  Tablet,
  Upload,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  CropDialog,
  useHeaderMediaSlot,
  type MediaUploadActions,
} from "@/features/media";
import { ActionSubmitButton } from "@/shared/components/action-submit-button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Button, buttonVariants } from "@/shared/components/ui/button";
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

/**
 * Every slot the app actually queries for (catalog loaders + the public
 * landing page). A slot key that doesn't match one of these never renders
 * anywhere, so the field is a dropdown scoped to the selected type instead
 * of free text.
 */
const slotOptionsByPlacementType = {
  CAROUSEL: [
    { label: "Carrossel do catálogo", value: "catalog-carousel" },
    { label: "Carrossel no meio da listagem", value: "catalog-midlist" },
  ],
  FEATURED_CREATOR: [
    { label: "Criador em destaque no catálogo", value: "catalog-featured" },
  ],
  INLINE_BANNER: [
    { label: "Banner lateral do catálogo", value: "catalog-inline" },
  ],
  TOP_BANNER: [
    { label: "Banner de topo do catálogo", value: "catalog-top" },
    {
      label: "Banner de topo da página inicial (pública)",
      value: "landing-top",
    },
  ],
} as const satisfies Record<string, { label: string; value: string }[]>;

function slotItemsFor(placementType: keyof typeof slotOptionsByPlacementType) {
  return Object.fromEntries(
    slotOptionsByPlacementType[placementType].map(({ label, value }) => [
      value,
      label,
    ]),
  );
}

const placementFormSchema = z
  .object({
    advertiserLabel: z.string().trim().max(160),
    audience: sponsorshipAudienceSchema,
    body: z.string().trim().max(500),
    creativeAssetId: z.string(),
    creativeAssetMobileId: z.string(),
    creativeAssetTabletId: z.string(),
    endsAt: z.string(),
    featuredCreatorProfileId: z.string(),
    linkLabel: z.string().trim().max(80),
    linkUrl: z.union([z.literal(""), safeSponsorshipLinkSchema]),
    placementType: sponsorshipPlacementTypeSchema,
    reason: z
      .string()
      .trim()
      .min(1, "Campo obrigatório.")
      .min(8, {
        message: "Explique o motivo em pelo menos 8 caracteres.",
      })
      .max(500, "Use até 500 caracteres."),
    slotKey: z.string().trim().min(1, "Selecione uma posição."),
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

    for (const field of [
      "creativeAssetId",
      "creativeAssetTabletId",
      "creativeAssetMobileId",
    ] as const) {
      if (values[field] && !z.uuid().safeParse(values[field]).success) {
        context.addIssue({
          code: "custom",
          message: "A mídia selecionada é inválida.",
          path: [field],
        });
      }
    }

    if (
      (values.creativeAssetTabletId || values.creativeAssetMobileId) &&
      !values.creativeAssetId
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Envie a imagem desktop antes de enviar as versões tablet ou mobile.",
        path: ["creativeAssetId"],
      });
    }

    if (
      !slotOptionsByPlacementType[values.placementType].some(
        (option) => option.value === values.slotKey,
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "Selecione uma posição válida para este tipo.",
        path: ["slotKey"],
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
    creativeAssetMobileId: placement?.creativeAssetMobileId ?? "",
    creativeAssetTabletId: placement?.creativeAssetTabletId ?? "",
    endsAt: toDateTimeLocal(placement?.endsAt ?? null),
    featuredCreatorProfileId: placement?.featuredCreatorProfileId ?? "",
    linkLabel: placement?.linkLabel ?? "",
    linkUrl: placement?.linkUrl ?? "",
    placementType: placement?.placementType ?? "TOP_BANNER",
    reason: "",
    slotKey:
      placement?.slotKey ??
      slotOptionsByPlacementType[placement?.placementType ?? "TOP_BANNER"][0]
        .value,
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
          decoding="async"
          height={placement.creative.height ?? 900}
          loading="lazy"
          referrerPolicy="no-referrer"
          src={placement.creative.url}
          width={placement.creative.width ?? 1_600}
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
          <a
            className={buttonVariants({ variant: "outline" })}
            href={placement.linkUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {placement.linkLabel ?? "Abrir link"}
          </a>
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

function LivePlacementPreview({
  imageSlot,
  values,
}: {
  imageSlot: ReturnType<typeof useHeaderMediaSlot>;
  values: Pick<
    PlacementFormValues,
    "audience" | "body" | "linkLabel" | "linkUrl" | "placementType" | "title"
  >;
}) {
  const imageUrl = imageSlot.displayedUrl;

  return (
    <Card className="border-brand-blue/30 bg-brand-blue-soft gap-0 overflow-hidden py-0">
      {imageSlot.fileInput}
      <div
        aria-label={
          imageUrl
            ? "Alterar imagem do criativo"
            : "Adicionar imagem do criativo"
        }
        className="group relative aspect-video w-full cursor-pointer"
        onClick={imageSlot.openPicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            imageSlot.openPicker();
          }
        }}
        role="button"
        tabIndex={0}
      >
        {imageUrl ? (
          // Blob/signed previews cannot use next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" className="size-full object-cover" src={imageUrl} />
        ) : (
          <div className="text-muted-foreground flex size-full items-center justify-center text-sm">
            Sem imagem selecionada
          </div>
        )}
        <div className="absolute inset-0 hidden items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100 sm:flex">
          <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black">
            <Camera aria-hidden="true" className="size-3.5" />
            {imageUrl ? "Alterar imagem" : "Adicionar imagem"}
          </span>
        </div>
        <span className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-black shadow-sm backdrop-blur-sm sm:hidden">
          <Upload aria-hidden="true" className="size-3.5" />
          {imageUrl ? "Alterar" : "Adicionar"}
        </span>
        {imageUrl ? (
          <Button
            aria-label="Remover imagem"
            className="absolute top-3 left-3 size-8 rounded-full"
            onClick={(event) => {
              event.stopPropagation();
              imageSlot.clear();
            }}
            size="icon"
            type="button"
            variant="secondary"
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        ) : null}
      </div>
      <p className="text-muted-foreground px-6 pt-3 text-xs">
        <Monitor
          aria-hidden="true"
          className="mr-1 inline size-3.5 align-text-bottom"
        />
        Desktop · exibida a partir de 1024px de largura · sugerido 1600×500px
        (16:5)
      </p>
      <CardHeader>
        <Badge className="w-fit" variant="outline">
          Prévia ao vivo
        </Badge>
        <CardTitle>{values.title || "Título do patrocínio"}</CardTitle>
        <CardDescription>
          {values.body || "Texto de apoio aparece aqui."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-muted-foreground text-sm">
          {typeLabels[values.placementType]} · {audienceLabels[values.audience]}
        </span>
        {values.linkUrl ? (
          <span className={buttonVariants({ variant: "outline" })}>
            {values.linkLabel || "Abrir link"}
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SecondaryCreativeSlot({
  disabledReason,
  Icon,
  imageSlot,
  label,
  resolutionHint,
}: {
  disabledReason?: string;
  Icon: typeof Monitor;
  imageSlot: ReturnType<typeof useHeaderMediaSlot>;
  label: string;
  resolutionHint: string;
}) {
  const imageUrl = imageSlot.displayedUrl;
  const disabled = Boolean(disabledReason);

  return (
    <div className="space-y-2">
      {imageSlot.fileInput}
      <div
        aria-disabled={disabled}
        aria-label={
          imageUrl
            ? `Alterar imagem do criativo (${label.toLowerCase()})`
            : `Adicionar imagem do criativo (${label.toLowerCase()})`
        }
        className={cn(
          "group bg-muted relative aspect-video w-full overflow-hidden rounded-lg border",
          disabled ? "cursor-not-allowed" : "cursor-pointer",
        )}
        onClick={disabled ? undefined : imageSlot.openPicker}
        onKeyDown={(event) => {
          if (disabled) {
            return;
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            imageSlot.openPicker();
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        {imageUrl ? (
          // Blob/signed previews cannot use next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className={cn("size-full object-cover", disabled && "opacity-50")}
            src={imageUrl}
          />
        ) : (
          <div className="text-muted-foreground flex size-full flex-col items-center justify-center gap-1 p-2 text-center text-xs">
            <Icon aria-hidden="true" className="size-4" />
            {disabledReason ?? "Sem imagem selecionada"}
          </div>
        )}
        {!disabled ? (
          <div className="absolute inset-0 hidden items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100 sm:flex">
            <span className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-black">
              <Camera aria-hidden="true" className="size-3" />
              {imageUrl ? "Alterar" : "Adicionar"}
            </span>
          </div>
        ) : null}
        {!disabled && imageUrl ? (
          <Button
            aria-label={`Remover imagem do criativo (${label.toLowerCase()})`}
            className="absolute top-1.5 right-1.5 size-7 rounded-full"
            onClick={(event) => {
              event.stopPropagation();
              imageSlot.clear();
            }}
            size="icon"
            type="button"
            variant="secondary"
          >
            <X aria-hidden="true" className="size-3.5" />
          </Button>
        ) : null}
      </div>
      <p className="text-muted-foreground text-xs">
        <Icon
          aria-hidden="true"
          className="mr-1 inline size-3.5 align-text-bottom"
        />
        {label} (opcional) · {resolutionHint}
      </p>
    </div>
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
    mode: "onTouched",
    resolver: zodResolver(placementFormSchema),
  });
  const watchedValues = useWatch({ control: form.control });
  const placementType = watchedValues.placementType ?? "TOP_BANNER";
  const creativeSlot = useHeaderMediaSlot({
    actions: mediaActions,
    activateOnUpload: false,
    slot: {
      currentAssetId: placement?.creativeAssetId ?? null,
      initialUrl: placement?.creative?.url ?? null,
      label: "Imagem do criativo (desktop)",
      purpose: "SPONSORSHIP_CREATIVE",
    },
  });
  const creativeTabletSlot = useHeaderMediaSlot({
    actions: mediaActions,
    activateOnUpload: false,
    slot: {
      currentAssetId: placement?.creativeAssetTabletId ?? null,
      initialUrl: placement?.creativeTablet?.url ?? null,
      label: "Imagem do criativo (tablet)",
      purpose: "SPONSORSHIP_CREATIVE",
    },
  });
  const creativeMobileSlot = useHeaderMediaSlot({
    actions: mediaActions,
    activateOnUpload: false,
    slot: {
      currentAssetId: placement?.creativeAssetMobileId ?? null,
      initialUrl: placement?.creativeMobile?.url ?? null,
      label: "Imagem do criativo (mobile)",
      purpose: "SPONSORSHIP_CREATIVE",
    },
  });
  /* Tablet/mobile are optional enhancements of the required desktop image —
   * clearing the desktop slot also drops them so the form can never end up
   * with a narrower variant but no desktop to fall back to. */
  const desktopSlotForPreview = {
    ...creativeSlot,
    clear: () => {
      creativeSlot.clear();
      creativeTabletSlot.clear();
      creativeMobileSlot.clear();
    },
  };

  useEffect(() => {
    form.setValue("creativeAssetId", creativeSlot.assetId ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creativeSlot.assetId]);

  useEffect(() => {
    form.setValue("creativeAssetTabletId", creativeTabletSlot.assetId ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creativeTabletSlot.assetId]);

  useEffect(() => {
    form.setValue("creativeAssetMobileId", creativeMobileSlot.assetId ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creativeMobileSlot.assetId]);

  useEffect(() => {
    const validSlots = slotOptionsByPlacementType[placementType];
    if (!validSlots.some((option) => option.value === watchedValues.slotKey)) {
      form.setValue("slotKey", validSlots[0].value, { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placementType]);

  async function onSubmit(input: PlacementFormValues) {
    const values = placementFormSchema.parse(input);
    const command: SponsorshipPlacementWriteInput = {
      advertiserLabel: nullable(values.advertiserLabel),
      audience: values.audience,
      body: nullable(values.body),
      creativeAssetId: nullable(values.creativeAssetId),
      creativeAssetMobileId: nullable(values.creativeAssetMobileId),
      creativeAssetTabletId: nullable(values.creativeAssetTabletId),
      endsAt: toIso(values.endsAt),
      // The write schema is `.strict()`, and `createSponsorshipPlacement`
      // omits this key from validation for new placements — an explicit
      // `expectedVersion: undefined` property still counts as present and
      // fails that strict check, so the key must be absent entirely here.
      ...(placement ? { expectedVersion: placement.version } : {}),
      featuredCreatorProfileId: nullable(
        values.placementType === "FEATURED_CREATOR"
          ? values.featuredCreatorProfileId
          : "",
      ),
      isActive: false,
      linkLabel: nullable(values.linkLabel),
      linkUrl: nullable(values.linkUrl),
      placementType: values.placementType,
      reason: values.reason,
      slotKey: values.slotKey,
      // The server always assigns new placements the last position; this
      // value is only meaningful (and only sent) when editing an existing one.
      sortOrder: placement?.sortOrder ?? 0,
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
      toast.success(placement ? "Patrocínio atualizado" : "Rascunho criado", {
        description: placement
          ? "As alterações foram salvas e já aparecem no backoffice."
          : "O patrocínio foi salvo como rascunho e ainda não está publicado.",
      });
      setOpen(false);
      form.reset(formDefaults());
      creativeSlot.clear();
      creativeTabletSlot.clear();
      creativeMobileSlot.clear();
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
          creativeSlot.resetToInitial();
          creativeTabletSlot.resetToInitial();
          creativeMobileSlot.resetToInitial();
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

          <LivePlacementPreview
            imageSlot={desktopSlotForPreview}
            values={{
              audience: watchedValues.audience ?? "ALL",
              body: watchedValues.body ?? "",
              linkLabel: watchedValues.linkLabel ?? "",
              linkUrl: watchedValues.linkUrl ?? "",
              placementType,
              title: watchedValues.title ?? "",
            }}
          />
          <CropDialog
            slot={{
              currentAssetId: placement?.creativeAssetId ?? null,
              initialUrl: placement?.creative?.url ?? null,
              label: "Imagem do criativo (desktop)",
              purpose: "SPONSORSHIP_CREATIVE",
            }}
            state={creativeSlot}
          />
          <CropDialog
            slot={{
              currentAssetId: placement?.creativeAssetTabletId ?? null,
              initialUrl: placement?.creativeTablet?.url ?? null,
              label: "Imagem do criativo (tablet)",
              purpose: "SPONSORSHIP_CREATIVE",
            }}
            state={creativeTabletSlot}
          />
          <CropDialog
            slot={{
              currentAssetId: placement?.creativeAssetMobileId ?? null,
              initialUrl: placement?.creativeMobile?.url ?? null,
              label: "Imagem do criativo (mobile)",
              purpose: "SPONSORSHIP_CREATIVE",
            }}
            state={creativeMobileSlot}
          />

          <Field data-invalid={Boolean(form.formState.errors.creativeAssetId)}>
            <FieldDescription>
              Versões opcionais para telas menores — a versão desktop é exibida
              quando uma variante específica não é enviada.
            </FieldDescription>
            <div className="grid gap-4 sm:grid-cols-2">
              <SecondaryCreativeSlot
                disabledReason={
                  creativeSlot.assetId
                    ? undefined
                    : "Envie a imagem desktop primeiro"
                }
                Icon={Tablet}
                imageSlot={creativeTabletSlot}
                label="Tablet"
                resolutionHint="640–1023px de largura · sugerido 1024×384px"
              />
              <SecondaryCreativeSlot
                disabledReason={
                  creativeSlot.assetId
                    ? undefined
                    : "Envie a imagem desktop primeiro"
                }
                Icon={Smartphone}
                imageSlot={creativeMobileSlot}
                label="Mobile"
                resolutionHint="até 639px de largura · sugerido 640×360px"
              />
            </div>
            <FieldError errors={[form.formState.errors.creativeAssetId]} />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={Boolean(form.formState.errors.placementType)}>
              <FieldLabel htmlFor="sponsorship-placement-type" required>
                Tipo
              </FieldLabel>
              <Controller
                control={form.control}
                name="placementType"
                render={({ field }) => (
                  <SearchableSelect
                    aria-invalid={Boolean(form.formState.errors.placementType)}
                    aria-required="true"
                    id="sponsorship-placement-type"
                    items={typeLabels}
                    onValueChange={field.onChange}
                    value={field.value}
                  />
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
                  <SearchableSelect
                    aria-invalid={Boolean(form.formState.errors.audience)}
                    aria-required="true"
                    id="sponsorship-placement-audience"
                    items={audienceLabels}
                    onValueChange={field.onChange}
                    value={field.value}
                  />
                )}
              />
              <FieldError errors={[form.formState.errors.audience]} />
            </Field>

            <Field
              className="sm:col-span-2"
              data-invalid={Boolean(form.formState.errors.slotKey)}
            >
              <FieldLabel htmlFor="sponsorship-slot-key" required>
                Posição
              </FieldLabel>
              <Controller
                control={form.control}
                name="slotKey"
                render={({ field }) => (
                  <SearchableSelect
                    aria-invalid={Boolean(form.formState.errors.slotKey)}
                    aria-required="true"
                    id="sponsorship-slot-key"
                    items={slotItemsFor(placementType)}
                    onValueChange={field.onChange}
                    value={field.value}
                  />
                )}
              />
              <FieldDescription>
                Onde este patrocínio aparece — as opções mudam conforme o tipo
                escolhido acima.
              </FieldDescription>
              <FieldError errors={[form.formState.errors.slotKey]} />
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
            <ActionSubmitButton
              pending={form.formState.isSubmitting}
              pendingLabel="Salvando patrocínio..."
            >
              {placement ? "Salvar alterações" : "Salvar rascunho"}
            </ActionSubmitButton>
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
          {typeLabels[placement.placementType]} · {placement.slotKey}
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
              <TableHead>Placement</TableHead>
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

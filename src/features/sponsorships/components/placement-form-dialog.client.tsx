"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  Circle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useHeaderMediaSlot, type MediaUploadActions } from "@/features/media";
import { ActionSubmitButton } from "@/shared/components/action-submit-button";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/shared/components/ui/alert";
import { RequiredFieldsNotice } from "@/shared/components/ui/field";
import { cn } from "@/shared/lib/cn";
import type {
  SponsorshipAdminPlacementDto,
  SponsorshipPlacementWriteInput,
} from "../api/sponsorship-management.contract";
import type { EligibleCreator } from "../api/eligible-creators.contract";
import { getPlacementSlot } from "../domain/placement-slot-catalog";
import {
  placementFormSchema,
  formDefaults,
  nullable,
  toIso,
  type PlacementFormValues,
} from "../schemas/placement-form.schema";
import { sponsorshipPlacementActivationSchema } from "../schemas/sponsorship-placement.schema";
import { PlacementSlotPicker } from "./placement-slot-picker";
import { PlacementContentStep } from "./placement-content-step.client";
import { PlacementAudienceStep } from "./placement-audience-step.client";
import { PlacementLivePreview } from "./placement-live-preview.client";
import type { SponsorshipMutationCallbacks } from "./sponsorship-management-view.client";

export function PlacementFormDialog({
  mediaActions,
  mutation,
  placement,
}: {
  mediaActions: MediaUploadActions;
  mutation: SponsorshipMutationCallbacks;
  placement?: SponsorshipAdminPlacementDto;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            className="min-h-11"
            size={placement ? "sm" : "default"}
            variant={placement ? "outline" : "default"}
            type="button"
          >
            {placement ? <Pencil /> : <Plus />}
            {placement ? "Editar" : "Novo patrocínio"}
          </Button>
        }
      />
      <DialogContent className="flex h-[96dvh] max-h-[96dvh] w-[calc(100%-1rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100%-3rem)] sm:max-w-6xl">
        {open ? (
          <PlacementForm
            mediaActions={mediaActions}
            mutation={mutation}
            placement={placement}
            onSaved={() => setOpen(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
function PlacementForm({
  mediaActions,
  mutation,
  placement,
  onSaved,
}: {
  mediaActions: MediaUploadActions;
  mutation: SponsorshipMutationCallbacks;
  placement?: SponsorshipAdminPlacementDto;
  onSaved(): void;
}) {
  const [step, setStep] = useState(0);
  const scrollRegion = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRegion.current?.scrollTo?.({ top: 0 });
  }, [step]);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creator, setCreator] = useState<EligibleCreator | null>(null);
  const form = useForm<PlacementFormValues>({
    defaultValues: formDefaults(placement),
    mode: "onTouched",
    resolver: zodResolver(placementFormSchema),
  });
  const values = useWatch({ control: form.control }) as PlacementFormValues;
  const slot =
    getPlacementSlot(values.slotKey) ?? getPlacementSlot("catalog-top")!;
  const desktop = useHeaderMediaSlot({
    actions: mediaActions,
    activateOnUpload: false,
    slot: {
      currentAssetId: placement?.creativeAssetId ?? null,
      initialUrl: placement?.creative?.url ?? null,
      label: "Imagem desktop",
      purpose: "SPONSORSHIP_CREATIVE",
      cropAspectRatio: slot.image.width / slot.image.height,
    },
  });
  const tablet = useHeaderMediaSlot({
    actions: mediaActions,
    activateOnUpload: false,
    slot: {
      currentAssetId: placement?.creativeAssetTabletId ?? null,
      initialUrl: placement?.creativeTablet?.url ?? null,
      label: "Imagem tablet",
      purpose: "SPONSORSHIP_CREATIVE",
      cropAspectRatio: slot.tabletImage.width / slot.tabletImage.height,
    },
  });
  const mobile = useHeaderMediaSlot({
    actions: mediaActions,
    activateOnUpload: false,
    slot: {
      currentAssetId: placement?.creativeAssetMobileId ?? null,
      initialUrl: placement?.creativeMobile?.url ?? null,
      label: "Imagem mobile",
      purpose: "SPONSORSHIP_CREATIVE",
      cropAspectRatio: slot.mobileImage.width / slot.mobileImage.height,
    },
  });
  const { setValue } = form;
  useEffect(() => {
    setValue("creativeAssetId", desktop.assetId ?? "", {
      shouldValidate: true,
    });
  }, [desktop.assetId, setValue]);
  useEffect(() => {
    setValue("creativeAssetTabletId", tablet.assetId ?? "", {
      shouldValidate: true,
    });
  }, [tablet.assetId, setValue]);
  useEffect(() => {
    setValue("creativeAssetMobileId", mobile.assetId ?? "", {
      shouldValidate: true,
    });
  }, [mobile.assetId, setValue]);
  function chooseSlot(key: string) {
    const next = getPlacementSlot(key)!;
    setValue("slotKey", key, { shouldDirty: true });
    setValue("placementType", next.placementType);
    if (next.route === "PUBLIC_LANDING") setValue("audience", "ALL");
    if (!next.usesLink) {
      setValue("linkLabel", "");
      setValue("linkUrl", "");
      setValue("linkOnCreative", false);
    }
    if (!next.usesImage) {
      desktop.clear();
      tablet.clear();
      mobile.clear();
      for (const field of [
        "textColor",
        "buttonBackgroundColor",
        "buttonTextColor",
        "fontFamily",
        "imageAlt",
      ] as const) {
        setValue(field, "", { shouldValidate: true });
      }
    }
    if (!next.supportsVariants) {
      tablet.clear();
      mobile.clear();
    }
    if (next.usesImage) {
      setValue("featuredCreatorProfileId", "");
      setCreator(null);
    }
  }
  function payload(input: PlacementFormValues): SponsorshipPlacementWriteInput {
    return {
      ...input,
      textColor: nullable(input.textColor),
      buttonBackgroundColor: nullable(input.buttonBackgroundColor),
      buttonTextColor: nullable(input.buttonTextColor),
      fontFamily: input.fontFamily || null,
      imageAlt: nullable(input.imageAlt),

      ...(placement ? { expectedVersion: placement.version } : {}),
      advertiserLabel: nullable(input.advertiserLabel),
      body: nullable(input.body),
      title: nullable(input.title),
      creativeAssetId: slot.usesImage ? nullable(input.creativeAssetId) : null,
      creativeAssetTabletId: slot.supportsVariants
        ? nullable(input.creativeAssetTabletId)
        : null,
      creativeAssetMobileId: slot.supportsVariants
        ? nullable(input.creativeAssetMobileId)
        : null,
      featuredCreatorProfileId: slot.usesImage
        ? null
        : nullable(input.featuredCreatorProfileId),
      linkLabel: slot.usesLink ? nullable(input.linkLabel) : null,
      linkUrl: slot.usesLink ? nullable(input.linkUrl) : null,
      startsAt: toIso(input.startsAt),
      endsAt: toIso(input.endsAt),
      isActive: false,
      sortOrder: placement?.sortOrder ?? 0,
    };
  }
  const activation = sponsorshipPlacementActivationSchema.safeParse({
    linkOnCreative: values.linkOnCreative,
    showSponsoredBadge: values.showSponsoredBadge,
    showAdvertiserLabel: values.showAdvertiserLabel,
    textColor: nullable(values.textColor),
    buttonBackgroundColor: nullable(values.buttonBackgroundColor),
    buttonTextColor: nullable(values.buttonTextColor),
    fontFamily: nullable(values.fontFamily),
    imageAlt: nullable(values.imageAlt),
    advertiserLabel: nullable(values.advertiserLabel),
    audience: values.audience,
    body: nullable(values.body),
    title: nullable(values.title),
    creativeAssetId: nullable(values.creativeAssetId),
    featuredCreatorProfileId: nullable(values.featuredCreatorProfileId),
    linkLabel: nullable(values.linkLabel),
    linkUrl: nullable(values.linkUrl),
    startsAt: values.startsAt ? `${values.startsAt}:00-03:00` : null,
    endsAt: values.endsAt ? `${values.endsAt}:00-03:00` : null,
    placementType: values.placementType,
    slotKey: values.slotKey,
    isActive: true,
  });
  const issues = activation.success
    ? []
    : [...new Set(activation.error.issues.map((issue) => issue.message))];
  async function save(input: PlacementFormValues) {
    setError(null);
    try {
      const command = payload(input);
      if (placement) await mutation.update(placement.id, command);
      else await mutation.create(command);
      toast.success(placement ? "Patrocínio atualizado" : "Rascunho criado");
      onSaved();
    } catch {
      setError("Não foi possível salvar. Confira os dados e tente novamente.");
    }
  }
  const steps = ["Posição", "Conteúdo", "Público e agenda"];
  return (
    <FormProvider {...form}>
      <DialogHeader className="shrink-0 border-b p-4 pr-12 sm:p-6 sm:pr-12">
        <p className="text-brand-blue text-xs font-bold">
          CONTEÚDO PROMOCIONAL
        </p>
        <DialogTitle className="text-xl font-bold sm:text-2xl">
          {placement ? "Editar patrocínio" : "Novo patrocínio"}
        </DialogTitle>
        <DialogDescription>
          Escolha o espaço, prepare a campanha e salve para revisar.
        </DialogDescription>
      </DialogHeader>
      <form
        className="flex min-h-0 flex-1 flex-col [&_[data-slot=combobox-input-group]]:min-h-12 [&_[data-slot=input]]:min-h-12"
        noValidate
        onSubmit={form.handleSubmit(save, (errors) => {
          setShowPreview(false);
          setStep(errors.startsAt || errors.endsAt || errors.reason ? 2 : 1);
        })}
      >
        <nav
          className="shrink-0 border-b px-4 py-3 sm:px-6"
          aria-label="Etapas do patrocínio"
        >
          <ol className="grid grid-cols-3 gap-2">
            {steps.map((label, index) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => {
                    setStep(index);
                    setShowPreview(false);
                  }}
                  aria-current={step === index ? "step" : undefined}
                  aria-label={`${index + 1} ${label}`}
                  className={cn(
                    "flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-2 text-xs font-semibold sm:justify-start sm:px-3 sm:text-sm",
                    step === index
                      ? "bg-brand-blue-soft text-brand-blue"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs",
                      step === index &&
                        "border-brand-blue bg-brand-blue text-white",
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="sm:hidden">
                    {index === 2 ? "Agenda" : label}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <div
          ref={scrollRegion}
          className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
        >
          <div className="min-w-0 p-4 sm:p-6">
            <Button
              className="mb-4 min-h-11 w-full lg:hidden"
              type="button"
              variant="outline"
              aria-expanded={showPreview}
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye />
              {showPreview ? "Voltar à edição" : "Ver prévia ao vivo"}
            </Button>
            <div className={cn(showPreview && "hidden lg:block", "space-y-5")}>
              <RequiredFieldsNotice />
              {step === 0 ? (
                <PlacementSlotPicker
                  value={values.slotKey}
                  onChange={chooseSlot}
                />
              ) : step === 1 ? (
                <PlacementContentStep
                  slot={slot}
                  desktop={desktop}
                  tablet={tablet}
                  mobile={mobile}
                  onCreator={setCreator}
                />
              ) : (
                <PlacementAudienceStep
                  isPublic={slot.route === "PUBLIC_LANDING"}
                  editing={Boolean(placement)}
                />
              )}
              {error ? (
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertTitle>Não foi possível salvar</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          </div>
          <aside
            className={cn(
              "bg-muted/25 min-w-0 border-t p-4 sm:p-6 lg:block lg:border-t-0 lg:border-l",
              !showPreview && "hidden",
            )}
          >
            <div className="lg:sticky lg:top-6">
              <PlacementLivePreview
                values={values}
                images={{
                  desktop: desktop.displayedUrl,
                  tablet: tablet.displayedUrl,
                  mobile: mobile.displayedUrl,
                }}
                creator={creator}
              />
            </div>
          </aside>
        </div>
        <footer className="bg-background shrink-0 space-y-3 border-t p-4 sm:px-6">
          <details className="text-sm">
            <summary className="flex min-h-6 cursor-pointer list-none items-center gap-2 font-semibold">
              {issues.length ? (
                <Circle className="text-muted-foreground size-4" />
              ) : (
                <Check className="text-brand-success size-4" />
              )}
              Pronto para ativar?{" "}
              <span className="text-muted-foreground font-normal">
                {issues.length
                  ? `${issues.length} ${issues.length === 1 ? "pendência" : "pendências"}`
                  : "Conteúdo preenchido"}
              </span>
            </summary>
            <ul className="text-muted-foreground mt-2 max-h-28 space-y-1 overflow-auto text-xs">
              {issues.map((issue) => (
                <li key={issue}>• {issue}</li>
              ))}
              <li>
                A ativação também confirma mídia, elegibilidade do criador e
                permissão de exibição.
              </li>
              {!form.formState.isDirty
                ? placement?.activationIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))
                : null}
            </ul>
          </details>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 sm:flex sm:flex-wrap">
            <Button
              type="button"
              className="min-h-11"
              variant="outline"
              disabled={step === 0}
              onClick={() => {
                setStep(step - 1);
                setShowPreview(false);
              }}
              aria-label="Etapa anterior"
            >
              <ChevronLeft />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
            <ActionSubmitButton
              className="col-start-2 row-start-1 min-h-11 w-full min-w-0 sm:w-auto sm:flex-none"
              variant={step < 2 ? "outline" : "default"}
              pending={form.formState.isSubmitting}
              disabled={
                desktop.upload.isBusy ||
                tablet.upload.isBusy ||
                mobile.upload.isBusy
              }
              pendingLabel="Salvando…"
            >
              {placement ? "Salvar alterações" : "Salvar rascunho"}
            </ActionSubmitButton>
            {step < 2 ? (
              <Button
                type="button"
                className="col-span-2 col-start-1 row-start-2 min-h-11 w-full min-w-0 sm:ml-auto sm:w-auto sm:flex-none"
                onClick={() => {
                  setStep(step + 1);
                  setShowPreview(false);
                }}
              >
                Continuar
                <ChevronRight />
              </Button>
            ) : null}
          </div>
        </footer>
      </form>
    </FormProvider>
  );
}

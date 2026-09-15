"use client";
import { useFormContext, useWatch } from "react-hook-form";
import { ImagePlus, ChevronDown, X } from "lucide-react";
import { CropDialog, useHeaderMediaSlot } from "@/features/media";
import { Button } from "@/shared/components/ui/button";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldDescription,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  placementImageRatio,
  type PlacementSlotMetadata,
} from "../domain/placement-slot-catalog";
import type { PlacementFormValues } from "../schemas/placement-form.schema";
import type { EligibleCreator } from "../api/eligible-creators.contract";
import { PlacementCreatorPicker } from "./placement-creator-picker.client";

type MediaSlot = ReturnType<typeof useHeaderMediaSlot>;
export function PlacementCreativeUpload({
  state,
  label,
  image,
  clear,
}: {
  state: MediaSlot;
  label: string;
  image: PlacementSlotMetadata["image"];
  clear?: () => void;
}) {
  return (
    <div className="space-y-2">
      {state.fileInput}
      <div className="bg-muted/40 relative overflow-hidden rounded-xl border border-dashed">
        <button
          aria-label={`Enviar imagem ${label.toLowerCase()}`}
          type="button"
          className="focus-visible:ring-brand-blue flex min-h-32 w-full flex-col items-center justify-center gap-2 px-4 py-5 focus-visible:ring-2 focus-visible:ring-inset"
          onClick={state.openPicker}
        >
          {state.displayedUrl ? (
            <span
              className={`block w-full overflow-hidden rounded-lg ${image.aspectClassName}`}
            >
              {/* Signed and local blob URLs are intentionally rendered without optimization. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`Criativo ${label.toLowerCase()}`}
                src={state.displayedUrl}
                className="size-full object-cover"
              />
            </span>
          ) : (
            <>
              <span className="bg-brand-blue-soft text-brand-blue flex size-10 items-center justify-center rounded-xl">
                <ImagePlus className="size-5" />
              </span>
              <span className="text-sm font-semibold">
                Enviar imagem {label.toLowerCase()}
              </span>
            </>
          )}
          <span className="text-muted-foreground text-xs">
            {image.width} × {image.height} px · {placementImageRatio(image)} ·
            JPG, PNG ou WebP · até 8 MB
          </span>
        </button>
        {state.assetId ? (
          <Button
            aria-label={`Remover imagem ${label.toLowerCase()}`}
            className="absolute top-2 right-2 min-h-11 min-w-11"
            variant="secondary"
            type="button"
            onClick={clear ?? state.clear}
          >
            <X />
          </Button>
        ) : null}
      </div>
      <CropDialog
        slot={{
          currentAssetId: state.assetId,
          initialUrl: state.displayedUrl,
          label: `Imagem ${label.toLowerCase()}`,
          purpose: "SPONSORSHIP_CREATIVE",
          cropAspectRatio: image.width / image.height,
          cropAspectClassName: image.aspectClassName,
        }}
        state={state}
      />
    </div>
  );
}
export function PlacementTextField({
  name,
  label,
  max,
  multiline,
  required,
  hint,
}: {
  name:
    "title" | "body" | "linkLabel" | "linkUrl" | "advertiserLabel" | "reason";
  label: string;
  max: number;
  multiline?: boolean;
  required?: boolean;
  hint?: string;
}) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<PlacementFormValues>();
  const value = useWatch({ control, name });
  const props = {
    id: `sponsorship-${name}`,
    maxLength: max,
    required,
    "aria-invalid": Boolean(errors[name]),
    ...register(name),
  };
  return (
    <Field data-invalid={Boolean(errors[name])}>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={props.id} required={required}>
          {label}
        </FieldLabel>
        {name !== "linkUrl" ? (
          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
            {value.length}/{max}
          </span>
        ) : null}
      </div>
      {multiline ? (
        <Textarea {...props} rows={3} />
      ) : (
        <Input
          {...props}
          inputMode={name === "linkUrl" ? "url" : undefined}
          placeholder={name === "linkUrl" ? "https://" : undefined}
        />
      )}
      {hint ? <FieldDescription>{hint}</FieldDescription> : null}
      <FieldError errors={[errors[name]]} />
    </Field>
  );
}
export function PlacementContentStep({
  slot,
  desktop,
  tablet,
  mobile,
  onCreator,
}: {
  slot: PlacementSlotMetadata;
  desktop: MediaSlot;
  tablet: MediaSlot;
  mobile: MediaSlot;
  onCreator(value: EligibleCreator | null): void;
}) {
  const form = useFormContext<PlacementFormValues>();
  const creatorId = useWatch({
    control: form.control,
    name: "featuredCreatorProfileId",
  });
  return (
    <section className="space-y-6" aria-labelledby="content-step-title">
      <div>
        <h3 id="content-step-title" className="text-xl font-bold">
          Dê vida ao seu patrocínio
        </h3>
        <p className="text-muted-foreground mt-1 text-sm leading-6">
          {slot.description}
        </p>
      </div>
      {slot.usesImage ? (
        <div className="space-y-4">
          <FieldLabel required>Imagem principal</FieldLabel>
          <PlacementCreativeUpload
            state={desktop}
            label="Desktop"
            image={slot.image}
            clear={() => {
              desktop.clear();
              tablet.clear();
              mobile.clear();
            }}
          />
          <FieldDescription>
            Recorte fixo no formato deste espaço. A imagem principal também
            aparece nas telas sem uma versão própria.
          </FieldDescription>
          {slot.supportsVariants ? (
            <details className="rounded-xl border p-4">
              <summary className="flex min-h-6 cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold">
                Opções avançadas de imagem
                <ChevronDown className="size-4" />
              </summary>
              <div className="mt-4 space-y-4">
                <p className="text-muted-foreground text-sm">
                  Versões opcionais para tablet e celular. Envie a principal
                  primeiro.
                </p>
                {desktop.assetId ? (
                  <>
                    <PlacementCreativeUpload
                      state={tablet}
                      label="Tablet"
                      image={slot.tabletImage}
                    />
                    <PlacementCreativeUpload
                      state={mobile}
                      label="Mobile"
                      image={slot.mobileImage}
                    />
                  </>
                ) : null}
              </div>
            </details>
          ) : null}
        </div>
      ) : (
        <Field>
          <FieldLabel htmlFor="sponsorship-featured-creator" required>
            Criador em destaque
          </FieldLabel>
          <PlacementCreatorPicker
            value={creatorId}
            onChange={(value) =>
              form.setValue("featuredCreatorProfileId", value, {
                shouldDirty: true,
              })
            }
            onSelection={onCreator}
          />
          <FieldDescription>
            A foto vem do perfil. O botão será sempre “Ver perfil”.
          </FieldDescription>
        </Field>
      )}
      <PlacementTextField
        name="title"
        label="Título"
        max={160}
        required
        hint="Obrigatório para ativar. Você pode completar o rascunho depois."
      />
      <PlacementTextField
        name="body"
        label={slot.bodyRequired ? "Texto" : "Texto (opcional)"}
        max={500}
        multiline
        required={slot.bodyRequired}
      />
      {slot.usesLink ? (
        <fieldset className="space-y-4 rounded-2xl border p-4">
          <legend className="px-2 text-sm font-bold">
            Botão de ação (opcional)
          </legend>
          <p className="text-muted-foreground text-sm leading-6">
            {slot.slotKey === "catalog-midlist"
              ? "O card inteiro vira clicável e abre este endereço em nova aba. O texto do botão identifica a ação, mas não aparece como botão."
              : "Quando a pessoa clicar no botão, abre este endereço em nova aba."}
          </p>
          <PlacementTextField
            name="linkLabel"
            label="Texto do botão"
            max={80}
          />
          <PlacementTextField
            name="linkUrl"
            label="Para onde leva (URL)"
            max={2048}
          />
        </fieldset>
      ) : null}
      <PlacementTextField
        name="advertiserLabel"
        label="Marca patrocinadora (opcional)"
        max={160}
        hint="Aparece no anúncio como “Patrocinado por X”."
      />
    </section>
  );
}

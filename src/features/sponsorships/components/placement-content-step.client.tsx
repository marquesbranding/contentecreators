"use client";
import { useFormContext, useWatch } from "react-hook-form";
import { ImagePlus, ChevronDown, X, Megaphone } from "lucide-react";
import { CropDialog, useHeaderMediaSlot } from "@/features/media";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  contrastRatio,
  sponsorshipFontFamilies,
  SPONSORSHIP_FONT_KEYS,
} from "../domain/sponsorship-appearance";
import { sponsorshipFontVariables } from "../domain/sponsorship-fonts";
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
    | "imageAlt"
    | "title"
    | "body"
    | "linkLabel"
    | "linkUrl"
    | "advertiserLabel"
    | "reason";
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
  const values = useWatch({ control: form.control });
  const contrast = contrastRatio(
    values.buttonTextColor ?? "",
    values.buttonBackgroundColor ?? "",
  );
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
      {slot.usesImage ? (
        <PlacementTextField
          name="imageAlt"
          label="Texto alternativo da imagem (opcional)"
          max={200}
          hint="Descreva a mensagem da arte para quem usa leitor de tela."
        />
      ) : null}
      <PlacementTextField
        name="title"
        label="Título (opcional)"
        max={160}
        hint="Deixe vazio para publicar apenas a imagem."
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
            Link do anúncio (opcional)
          </legend>
          <PlacementTextField
            name="linkUrl"
            label="Para onde leva (URL)"
            max={2048}
          />
          <PlacementCheckbox
            name="linkOnCreative"
            label="Banner clicável — a imagem e o texto abrem o link"
          />
          <PlacementTextField
            name="linkLabel"
            label="Texto do botão (opcional)"
            max={80}
            hint="Deixe vazio para não exibir botão."
          />
          {values.linkUrl && !values.linkOnCreative && !values.linkLabel ? (
            <p role="status" className="text-muted-foreground text-sm">
              O link não aparece no anúncio: ative “Banner clicável” ou preencha
              o texto do botão.
            </p>
          ) : null}
        </fieldset>
      ) : null}
      {slot.usesImage ? (
        <details
          className={`rounded-2xl border p-4 ${sponsorshipFontVariables}`}
        >
          <summary className="cursor-pointer text-sm font-bold">
            Aparência (opcional)
          </summary>
          <div className="mt-4 space-y-4">
            <p className="text-muted-foreground text-sm">
              Sem sombreamento automático: escolha uma imagem com área limpa
              para o texto ou use uma cor de texto que contraste com ela.
            </p>
            <PlacementColor name="textColor" label="Cor do texto" />
            <PlacementColor
              name="buttonBackgroundColor"
              label="Cor de fundo do botão"
            />
            <PlacementColor
              name="buttonTextColor"
              label="Cor do texto do botão"
            />
            <Field>
              <FieldLabel htmlFor="sponsorship-fontFamily">Fonte</FieldLabel>
              <Select
                value={values.fontFamily ?? ""}
                onValueChange={(value) =>
                  form.setValue("fontFamily", value ?? "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger
                  id="sponsorship-fontFamily"
                  className="min-h-12 w-full rounded-xl"
                  style={{
                    fontFamily: values.fontFamily
                      ? sponsorshipFontFamilies[values.fontFamily]
                      : undefined,
                  }}
                >
                  <SelectValue>
                    {values.fontFamily
                      ? {
                          default: "Geist",
                          serif: "Playfair Display",
                          display: "Montserrat",
                          rounded: "Nunito",
                          mono: "Geist Mono",
                        }[values.fontFamily]
                      : "Usar padrão"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className={sponsorshipFontVariables}>
                  <SelectItem value="">Usar padrão</SelectItem>
                  {SPONSORSHIP_FONT_KEYS.map((key) => (
                    <SelectItem
                      key={key}
                      value={key}
                      style={{ fontFamily: sponsorshipFontFamilies[key] }}
                    >
                      {
                        {
                          default: "Geist",
                          serif: "Playfair Display",
                          display: "Montserrat",
                          rounded: "Nunito",
                          mono: "Geist Mono",
                        }[key]
                      }
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {contrast !== null && contrast < 4.5 ? (
              <p role="status" className="text-sm text-amber-800">
                Contraste baixo entre o texto e o fundo do botão (
                {contrast.toFixed(2)}:1). Escolha cores com contraste de pelo
                menos 4,5:1.
              </p>
            ) : null}
          </div>
        </details>
      ) : null}
      <fieldset className="space-y-4 rounded-2xl border p-4">
        <legend className="px-2 text-sm font-bold">Identificação</legend>
        <PlacementCheckbox
          name="showSponsoredBadge"
          label={
            <>
              <Megaphone aria-hidden="true" className="size-4" />
              Exibir “Conteúdo patrocinado”
            </>
          }
        />
        <p className="text-muted-foreground text-sm">
          Desmarque apenas se a imagem já deixar claro que é publicidade.
        </p>
        <PlacementCheckbox
          name="showAdvertiserLabel"
          label="Exibir empresa patrocinadora"
        />
        {values.showAdvertiserLabel ? (
          <PlacementTextField
            name="advertiserLabel"
            label="Nome da empresa"
            max={160}
            required
            hint="Aparece como “Patrocinado por Contente Creators”."
          />
        ) : null}
      </fieldset>
    </section>
  );
}
function PlacementCheckbox({
  name,
  label,
}: {
  name: "linkOnCreative" | "showSponsoredBadge" | "showAdvertiserLabel";
  label: React.ReactNode;
}) {
  const form = useFormContext<PlacementFormValues>();
  const value = useWatch({ control: form.control, name });
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
      <Checkbox
        checked={value}
        onCheckedChange={(checked) =>
          form.setValue(name, checked === true, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
      />
      <span className="flex items-center gap-2">{label}</span>
    </label>
  );
}
function PlacementColor({
  name,
  label,
}: {
  name: "textColor" | "buttonBackgroundColor" | "buttonTextColor";
  label: string;
}) {
  const form = useFormContext<PlacementFormValues>();
  const value = useWatch({ control: form.control, name });
  return (
    <Field>
      <FieldLabel htmlFor={`sponsorship-${name}`}>{label}</FieldLabel>
      <div className="flex gap-2">
        <input
          type="color"
          aria-label={`Selecionar ${label.toLowerCase()}`}
          className="h-12 w-12 shrink-0 rounded-xl border"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
          onChange={(event) =>
            form.setValue(name, event.target.value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
        <Input
          id={`sponsorship-${name}`}
          placeholder="#FF5500"
          maxLength={7}
          aria-invalid={Boolean(form.formState.errors[name])}
          {...form.register(name)}
        />
        <Button
          variant="outline"
          type="button"
          onClick={() =>
            form.setValue(name, "", { shouldDirty: true, shouldValidate: true })
          }
        >
          Usar padrão
        </Button>
      </div>
      <FieldError errors={[form.formState.errors[name]]} />
    </Field>
  );
}

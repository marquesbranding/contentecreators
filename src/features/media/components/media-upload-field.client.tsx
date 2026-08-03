"use client";

import {
  CheckCircle2,
  CircleAlert,
  Crop,
  ImagePlus,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { useId } from "react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
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
  FieldLabel,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/shared/components/ui/progress";
import { Spinner } from "@/shared/components/ui/spinner";
import { cn } from "@/shared/lib/cn";

import { useMediaUpload } from "../hooks/use-media-upload";
import type {
  MediaPurpose,
  MediaUploadActions,
} from "../types/media-upload.types";

const descriptionByPurpose: Readonly<Record<MediaPurpose, string>> = {
  AVATAR: "Quadrada, JPEG/PNG/WebP, até 5 MB.",
  COVER: "Horizontal, JPEG/PNG/WebP, até 8 MB.",
  LOGO: "Quadrada, JPEG/PNG/WebP, até 5 MB.",
  SPONSORSHIP_CREATIVE: "Horizontal, JPEG/PNG/WebP, até 8 MB.",
};

const previewAspectByPurpose: Readonly<Record<MediaPurpose, string>> = {
  AVATAR: "aspect-square",
  COVER: "aspect-video",
  LOGO: "aspect-square",
  SPONSORSHIP_CREATIVE: "aspect-video",
};

interface MediaUploadFieldProps {
  actions: MediaUploadActions;
  activateOnUpload?: boolean;
  currentAssetId: string | null;
  label: string;
  onComplete?: (assetId: string) => void;
  onProfileVersionChange?: (version: number) => void;
  purpose: MediaPurpose;
  required?: boolean;
}

export function MediaUploadField({
  actions,
  activateOnUpload = true,
  currentAssetId,
  label,
  onComplete,
  onProfileVersionChange,
  purpose,
  required = false,
}: MediaUploadFieldProps) {
  const inputId = useId();
  const descriptionId = `${inputId}-description`;
  const upload = useMediaUpload({
    actions,
    activateOnUpload,
    currentAssetId,
    onComplete,
    onProfileVersionChange,
    purpose,
  });

  return (
    <Field data-invalid={Boolean(upload.error)}>
      <FieldLabel htmlFor={inputId} required={required}>
        {label}
      </FieldLabel>
      <FieldDescription id={descriptionId}>
        {descriptionByPurpose[purpose]}
      </FieldDescription>
      <Card className="rounded-2xl py-0">
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <Input
              accept="image/jpeg,image/png,image/webp"
              aria-describedby={descriptionId}
              aria-invalid={Boolean(upload.error)}
              className="sr-only"
              disabled={upload.isBusy}
              id={inputId}
              onChange={(event) =>
                upload.selectFile(event.target.files?.[0] ?? null)
              }
              required={required}
              type="file"
            />
            <label
              className={cn(
                "border-input bg-background hover:bg-muted/70 focus-within:ring-ring/40 flex min-h-12 min-w-0 cursor-pointer items-center gap-3 rounded-xl border px-4 transition-colors focus-within:ring-3",
                upload.isBusy && "pointer-events-none opacity-50",
              )}
              htmlFor={inputId}
            >
              <span className="bg-brand-blue-soft text-brand-blue flex size-8 shrink-0 items-center justify-center rounded-lg">
                <ImagePlus aria-hidden="true" className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  Selecionar imagem
                </span>
                <span className="text-muted-foreground block truncate text-sm">
                  {upload.file?.name ?? "Nenhum arquivo selecionado"}
                </span>
              </span>
            </label>

            <Button
              className="w-full sm:w-fit"
              disabled={!upload.file || upload.isBusy}
              onClick={upload.upload}
              type="button"
            >
              {upload.isBusy ? (
                <Spinner aria-label="Enviando imagem" />
              ) : (
                <Upload aria-hidden="true" />
              )}
              {upload.isBusy ? "Enviando..." : "Enviar imagem"}
            </Button>
          </div>

          {upload.previewUrl && upload.file ? (
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div
                className={cn(
                  "bg-muted relative w-full max-w-md overflow-hidden rounded-xl border",
                  previewAspectByPurpose[purpose],
                )}
              >
                {/* Blob previews cannot use next/image. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`Prévia de ${upload.file.name}`}
                  className="size-full object-cover"
                  src={upload.previewUrl}
                  style={{
                    objectPosition: `${upload.crop.horizontal}% ${upload.crop.vertical}%`,
                    transform: `scale(${upload.crop.zoom})`,
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Dialog>
                  <DialogTrigger
                    render={
                      <Button
                        disabled={upload.isBusy}
                        type="button"
                        variant="outline"
                      />
                    }
                  >
                    <Crop aria-hidden="true" />
                    Ajustar recorte
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                      <DialogTitle>Ajustar recorte</DialogTitle>
                      <DialogDescription>
                        Amplie e reposicione a imagem. O recorte final respeita
                        o formato desta mídia.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-5">
                      <div
                        className={cn(
                          "bg-muted relative mx-auto w-full max-w-md overflow-hidden rounded-xl border",
                          previewAspectByPurpose[purpose],
                        )}
                      >
                        {/* Blob previews cannot use next/image. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt=""
                          aria-hidden="true"
                          className="size-full object-cover"
                          src={upload.previewUrl}
                          style={{
                            objectPosition: `${upload.crop.horizontal}% ${upload.crop.vertical}%`,
                            transform: `scale(${upload.crop.zoom})`,
                          }}
                        />
                      </div>
                      <CropControl
                        label="Ampliação"
                        max={2}
                        min={1}
                        onChange={(zoom) =>
                          upload.setCrop((current) => ({
                            ...current,
                            zoom,
                          }))
                        }
                        step={0.1}
                        value={upload.crop.zoom}
                      />
                      <CropControl
                        label="Posição horizontal"
                        max={100}
                        min={0}
                        onChange={(horizontal) =>
                          upload.setCrop((current) => ({
                            ...current,
                            horizontal,
                          }))
                        }
                        step={1}
                        value={upload.crop.horizontal}
                      />
                      <CropControl
                        label="Posição vertical"
                        max={100}
                        min={0}
                        onChange={(vertical) =>
                          upload.setCrop((current) => ({
                            ...current,
                            vertical,
                          }))
                        }
                        step={1}
                        value={upload.crop.vertical}
                      />
                    </div>
                    <DialogFooter showCloseButton />
                  </DialogContent>
                </Dialog>
                <Button
                  disabled={upload.isBusy}
                  onClick={upload.reset}
                  type="button"
                  variant="ghost"
                >
                  <Trash2 aria-hidden="true" />
                  Remover seleção
                </Button>
              </div>
            </div>
          ) : null}

          {upload.isBusy ? (
            <Progress
              aria-live="polite"
              aria-label="Progresso do envio"
              value={upload.progress}
            >
              <ProgressLabel>{upload.statusMessage}</ProgressLabel>
              <ProgressValue>{() => `${upload.progress}%`}</ProgressValue>
            </Progress>
          ) : null}

          {upload.error ? (
            <Alert aria-live="assertive" variant="destructive">
              <CircleAlert aria-hidden="true" />
              <AlertTitle>Não foi possível enviar</AlertTitle>
              <AlertDescription>{upload.error}</AlertDescription>
            </Alert>
          ) : null}

          {upload.phase === "success" ? (
            <Alert aria-live="polite">
              <CheckCircle2
                aria-hidden="true"
                className="text-[var(--brand-success)]"
              />
              <AlertTitle>Imagem atualizada</AlertTitle>
              <AlertDescription>
                {activateOnUpload
                  ? "Imagem atualizada com sucesso."
                  : "Imagem pronta para o envio do perfil."}
              </AlertDescription>
            </Alert>
          ) : null}

          {upload.phase === "error" && upload.file ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                disabled={upload.isBusy}
                onClick={upload.retry}
                type="button"
                variant="outline"
              >
                <RotateCcw aria-hidden="true" />
                Tentar novamente
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Field>
  );
}

function CropControl({
  label,
  max,
  min,
  onChange,
  step,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
}) {
  const id = useId();

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="range"
        value={value}
      />
    </Field>
  );
}

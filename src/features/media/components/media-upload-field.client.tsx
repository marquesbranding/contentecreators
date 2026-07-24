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
  AVATAR: "Use uma imagem quadrada em JPEG, PNG ou WebP, com até 5 MB.",
  COVER: "Use uma imagem horizontal em JPEG, PNG ou WebP, com até 8 MB.",
  LOGO: "Use uma imagem quadrada em JPEG, PNG ou WebP, com até 5 MB.",
  SPONSORSHIP_CREATIVE:
    "Use uma imagem horizontal em JPEG, PNG ou WebP, com até 8 MB.",
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
      <Card className="gap-4 py-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImagePlus aria-hidden="true" />
            Selecione e ajuste a imagem
          </CardTitle>
          <CardDescription>
            O recorte é aplicado antes do envio seguro.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            accept="image/jpeg,image/png,image/webp"
            aria-describedby={descriptionId}
            aria-invalid={Boolean(upload.error)}
            disabled={upload.isBusy}
            id={inputId}
            onChange={(event) =>
              upload.selectFile(event.target.files?.[0] ?? null)
            }
            required={required}
            type="file"
          />

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

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {upload.phase === "error" && upload.file ? (
              <Button
                disabled={upload.isBusy}
                onClick={upload.retry}
                type="button"
                variant="outline"
              >
                <RotateCcw aria-hidden="true" />
                Tentar novamente
              </Button>
            ) : null}
            <Button
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

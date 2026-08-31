"use client";

import {
  CheckCircle2,
  CircleAlert,
  Crop,
  ImageOff,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { SignedImage } from "@/shared/components/signed-image";
import { Button } from "@/shared/components/ui/button";
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

import { MediaCropFields } from "./media-crop-fields.client";
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
  initialUrl?: string | null;
  label: string;
  onComplete?: (assetId: string) => void;
  onPreviewChange?: (url: string | null) => void;
  onProfileVersionChange?: (version: number) => void;
  onRemove?: () => void;
  purpose: MediaPurpose;
  required?: boolean;
}

export function MediaUploadField({
  actions,
  activateOnUpload = true,
  currentAssetId,
  initialUrl = null,
  label,
  onComplete,
  onPreviewChange,
  onProfileVersionChange,
  onRemove,
  purpose,
  required = false,
}: MediaUploadFieldProps) {
  const inputId = useId();
  const descriptionId = `${inputId}-description`;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const upload = useMediaUpload({
    actions,
    activateOnUpload,
    currentAssetId,
    onComplete,
    onProfileVersionChange,
    onRemove,
    purpose,
  });
  const editing =
    Boolean(upload.previewUrl && upload.file) && upload.phase !== "success";
  const displayedUrl = upload.previewUrl ?? initialUrl;

  useEffect(() => {
    onPreviewChange?.(displayedUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedUrl]);

  return (
    <Field data-invalid={Boolean(upload.error)}>
      <FieldLabel htmlFor={inputId} required={required}>
        {label}
      </FieldLabel>
      <FieldDescription id={descriptionId}>
        {descriptionByPurpose[purpose]}
      </FieldDescription>

      <Input
        accept="image/jpeg,image/png,image/webp"
        aria-describedby={descriptionId}
        aria-invalid={Boolean(upload.error)}
        className="sr-only"
        disabled={upload.isBusy}
        id={inputId}
        onChange={(event) => {
          upload.selectFile(event.target.files?.[0] ?? null);
        }}
        ref={fileInputRef}
        required={required}
        tabIndex={-1}
        type="file"
      />

      {!editing ? (
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "bg-muted text-muted-foreground relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border",
              previewAspectByPurpose[purpose] === "aspect-video" &&
                "w-24 rounded-lg",
            )}
          >
            {currentAssetId && initialUrl ? (
              // Blob/signed previews cannot use next/image.
              <SignedImage
                alt={`Prévia de ${label.toLowerCase()}`}
                className="size-full object-cover"
                src={initialUrl}
              />
            ) : currentAssetId ? (
              <CheckCircle2
                aria-hidden="true"
                className="text-[var(--brand-success)]"
              />
            ) : (
              <ImageOff aria-hidden="true" />
            )}
          </div>

          <Dialog onOpenChange={setMenuOpen} open={menuOpen}>
            <DialogTrigger
              render={
                <Button disabled={upload.isBusy} type="button" variant="outline" />
              }
            >
              Mudar foto
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Alterar {label.toLowerCase()}</DialogTitle>
                <DialogDescription>
                  Escolha o que fazer com esta imagem.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                <Button
                  className="justify-start"
                  onClick={() => {
                    setMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  type="button"
                  variant="outline"
                >
                  Carregar foto
                </Button>
                {upload.canRemove ? (
                  <Button
                    className="justify-start"
                    disabled={upload.isRemoving}
                    onClick={() => {
                      setMenuOpen(false);
                      void upload.removeCurrent();
                    }}
                    type="button"
                    variant="outline"
                  >
                    {upload.isRemoving ? (
                      <Spinner aria-label="Removendo imagem" />
                    ) : (
                      <Trash2 aria-hidden="true" />
                    )}
                    Remover foto atual
                  </Button>
                ) : null}
              </div>
              <DialogFooter>
                <Button
                  onClick={() => setMenuOpen(false)}
                  type="button"
                  variant="ghost"
                >
                  Cancelar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
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
              alt={`Prévia de ${upload.file?.name}`}
              className="size-full object-cover"
              src={upload.previewUrl ?? undefined}
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
                    Amplie e reposicione a imagem. O recorte final respeita o
                    formato desta mídia.
                  </DialogDescription>
                </DialogHeader>
                <MediaCropFields
                  aspectClassName={previewAspectByPurpose[purpose]}
                  crop={upload.crop}
                  previewUrl={upload.previewUrl}
                  setCrop={upload.setCrop}
                />
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
      )}

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
          <AlertTitle>Não foi possível concluir</AlertTitle>
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

      {editing ? (
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
      ) : null}
    </Field>
  );
}


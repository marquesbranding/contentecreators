"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getBrowserSupabaseClient } from "@/shared/lib/supabase/browser-client";
import { validateImageUpload } from "@/shared/lib/media/image-validation";

import { cropImageFile, type ImageCropSettings } from "../domain/crop-image";
import type {
  MediaPurpose,
  MediaUploadActions,
  MediaUploadErrorCode,
} from "../types/media-upload.types";

type MediaUploadPhase =
  | "activating"
  | "error"
  | "finalizing"
  | "idle"
  | "preparing"
  | "preview"
  | "success"
  | "uploading";

const initialCrop: ImageCropSettings = {
  horizontal: 50,
  vertical: 50,
  zoom: 1,
};

const errorMessages: Readonly<Record<MediaUploadErrorCode, string>> = {
  ACCESS_DENIED: "Sua conta não pode alterar esta imagem no momento.",
  EMPTY_FILE: "Selecione uma imagem que não esteja vazia.",
  EXTENSION_MISMATCH:
    "A extensão do arquivo não corresponde ao formato da imagem.",
  FILE_TOO_LARGE: "A imagem ultrapassa o limite permitido.",
  INVALID_IMAGE_DIMENSIONS:
    "Não foi possível validar as dimensões da imagem enviada.",
  INVALID_INPUT: "Revise o arquivo selecionado e tente novamente.",
  MEDIA_ASSET_NOT_FOUND: "A imagem enviada não foi encontrada para ativação.",
  MEDIA_REPLACEMENT_CONFLICT:
    "A imagem atual mudou. Atualize a página e tente novamente.",
  MIME_SIGNATURE_MISMATCH:
    "O conteúdo da imagem não corresponde ao tipo informado.",
  OBJECT_NOT_FOUND: "O envio não foi localizado. Selecione a imagem novamente.",
  OBJECT_PATH_INVALID: "O destino da imagem não é válido para esta conta.",
  STORAGE_UNAVAILABLE: "Não foi possível acessar o armazenamento agora.",
  UNSUPPORTED_DECLARED_MIME: "Use uma imagem JPEG, PNG ou WebP.",
  UNSUPPORTED_EXTENSION: "Use uma imagem com extensão JPG, JPEG, PNG ou WebP.",
  UNSUPPORTED_IMAGE_SIGNATURE:
    "O arquivo selecionado não contém uma imagem compatível.",
};

const progressByPhase: Readonly<Record<MediaUploadPhase, number>> = {
  activating: 90,
  error: 0,
  finalizing: 75,
  idle: 0,
  preparing: 15,
  preview: 0,
  success: 100,
  uploading: 45,
};

const statusByPhase: Readonly<Record<MediaUploadPhase, string>> = {
  activating: "Ativando a nova imagem",
  error: "Envio interrompido",
  finalizing: "Validando o arquivo enviado",
  idle: "Aguardando uma imagem",
  preparing: "Preparando envio seguro",
  preview: "Imagem pronta para ajuste",
  success: "Imagem atualizada",
  uploading: "Enviando imagem",
};

interface UseMediaUploadInput {
  actions: MediaUploadActions;
  activateOnUpload?: boolean;
  currentAssetId: string | null;
  onComplete?: (assetId: string) => void;
  onProfileVersionChange?: (version: number) => void;
  onRemove?: () => void;
  purpose: MediaPurpose;
}

async function readHeaderBytes(file: File) {
  return new Uint8Array(await file.slice(0, 12).arrayBuffer());
}

export function useMediaUpload({
  actions,
  activateOnUpload = true,
  currentAssetId,
  onComplete,
  onProfileVersionChange,
  onRemove,
  purpose,
}: UseMediaUploadInput) {
  const [crop, setCrop] = useState<ImageCropSettings>(initialCrop);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<MediaUploadPhase>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const selectFile = useCallback((selectedFile: File | null) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const nextPreviewUrl = selectedFile
      ? URL.createObjectURL(selectedFile)
      : null;
    previewUrlRef.current = nextPreviewUrl;
    setCrop(initialCrop);
    setError(null);
    setFile(selectedFile);
    setPhase(selectedFile ? "preview" : "idle");
    setPreviewUrl(nextPreviewUrl);
  }, []);

  const reset = useCallback(() => {
    selectFile(null);
  }, [selectFile]);

  const upload = useCallback(async () => {
    if (!file) {
      setError("Selecione uma imagem antes de continuar.");
      setPhase("error");
      return;
    }

    try {
      setError(null);
      setPhase("preparing");
      const croppedFile = await cropImageFile(file, purpose, crop);
      const validation = validateImageUpload({
        declaredMimeType: croppedFile.type,
        fileName: croppedFile.name,
        headerBytes: await readHeaderBytes(croppedFile),
        purpose,
        sizeBytes: croppedFile.size,
      });

      if (!validation.ok) {
        setError(errorMessages[validation.code]);
        setPhase("error");
        return;
      }

      const preparation = await actions.prepare({
        declaredMimeType: validation.value.mimeType,
        fileName: croppedFile.name,
        purpose,
        sizeBytes: validation.value.sizeBytes,
      });

      if (preparation.kind === "error") {
        setError(errorMessages[preparation.code]);
        setPhase("error");
        return;
      }

      setPhase("uploading");
      const { bucketName, objectPath, token } = preparation.upload;
      const { error: uploadError } = await getBrowserSupabaseClient()
        .storage.from(bucketName)
        .uploadToSignedUrl(objectPath, token, croppedFile, {
          contentType: validation.value.mimeType,
          upsert: false,
        });

      if (uploadError) {
        setError(errorMessages.STORAGE_UNAVAILABLE);
        setPhase("error");
        return;
      }

      setPhase("finalizing");
      const finalization = await actions.finalize({
        bucketName,
        objectPath,
        purpose,
      });

      if (finalization.kind === "error") {
        setError(errorMessages[finalization.code]);
        setPhase("error");
        return;
      }

      let completedAssetId = finalization.asset.id;

      if (purpose !== "SPONSORSHIP_CREATIVE" && activateOnUpload) {
        if (!actions.activate) {
          setError("Não foi possível ativar a imagem enviada.");
          setPhase("error");
          return;
        }

        setPhase("activating");
        const activation = await actions.activate({
          assetId: finalization.asset.id,
          expectedCurrentAssetId: currentAssetId,
          purpose,
        });

        if (activation.kind === "error") {
          setError(errorMessages[activation.code]);
          setPhase("error");
          return;
        }

        completedAssetId = activation.asset.id;
        onProfileVersionChange?.(activation.profileVersion);
      }

      setPhase("success");
      onComplete?.(completedAssetId);
    } catch {
      setError(errorMessages.STORAGE_UNAVAILABLE);
      setPhase("error");
    }
  }, [
    actions,
    activateOnUpload,
    crop,
    currentAssetId,
    file,
    onComplete,
    onProfileVersionChange,
    purpose,
  ]);

  const retry = useCallback(async () => {
    await upload();
  }, [upload]);

  const removeCurrent = useCallback(async () => {
    if (!actions.remove || purpose === "SPONSORSHIP_CREATIVE") {
      setError("Não foi possível remover esta imagem agora.");
      setPhase("error");
      return;
    }

    setIsRemoving(true);
    setError(null);

    try {
      const result = await actions.remove({ purpose });

      if (result.kind === "error") {
        setError(errorMessages[result.code] ?? errorMessages.STORAGE_UNAVAILABLE);
        setPhase("error");
        return;
      }

      onProfileVersionChange?.(result.profileVersion);
      onRemove?.();
    } catch {
      setError(errorMessages.STORAGE_UNAVAILABLE);
      setPhase("error");
    } finally {
      setIsRemoving(false);
    }
  }, [actions, onProfileVersionChange, onRemove, purpose]);

  const isBusy =
    phase === "activating" ||
    phase === "finalizing" ||
    phase === "preparing" ||
    phase === "uploading";

  return useMemo(
    () => ({
      canRemove:
        Boolean(actions.remove) &&
        Boolean(currentAssetId) &&
        purpose !== "SPONSORSHIP_CREATIVE",
      crop,
      error,
      file,
      isBusy,
      isRemoving,
      phase,
      previewUrl,
      progress: progressByPhase[phase],
      removeCurrent,
      reset,
      retry,
      selectFile,
      setCrop,
      statusMessage: statusByPhase[phase],
      upload,
    }),
    [
      actions.remove,
      crop,
      currentAssetId,
      error,
      file,
      isBusy,
      isRemoving,
      phase,
      previewUrl,
      purpose,
      removeCurrent,
      reset,
      retry,
      selectFile,
      upload,
    ],
  );
}

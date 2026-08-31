"use client";

import { CircleAlert, Upload } from "lucide-react";
import { useRef, useState } from "react";

import {
  ProfileHeaderPreview,
  type ProfileHeaderPreviewBadge,
} from "@/shared/components/profile-header-preview";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/shared/components/ui/progress";
import { Spinner } from "@/shared/components/ui/spinner";

import { useMediaUpload } from "../hooks/use-media-upload";
import type {
  MediaPurpose,
  MediaUploadActions,
} from "../types/media-upload.types";
import { MediaCropFields } from "./media-crop-fields.client";

const cropAspectByPurpose: Readonly<Record<MediaPurpose, string>> = {
  AVATAR: "aspect-square",
  COVER: "aspect-video",
  LOGO: "aspect-square",
  SPONSORSHIP_CREATIVE: "aspect-video",
};

interface SlotConfig {
  currentAssetId: string | null;
  initialUrl: string | null;
  label: string;
  purpose: MediaPurpose;
}

/**
 * Drives one image slot from a click on the header preview itself: the hidden
 * input opens the picker, and the crop dialog opens as soon as a file is
 * chosen, so the whole flow happens where the user sees the image.
 */
function useHeaderMediaSlot({
  actions,
  onProfileVersionChange,
  slot,
}: {
  actions: MediaUploadActions;
  onProfileVersionChange: (version: number) => void;
  slot: SlotConfig;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [assetId, setAssetId] = useState(slot.currentAssetId);
  const upload = useMediaUpload({
    actions,
    /* The profile already exists here, so an upload publishes immediately —
     * the form's Salvar button is not involved. */
    activateOnUpload: true,
    currentAssetId: assetId,
    onComplete: setAssetId,
    onProfileVersionChange,
    onRemove: () => setAssetId(null),
    purpose: slot.purpose,
  });
  const isEditing =
    Boolean(upload.previewUrl && upload.file) && upload.phase !== "success";

  /* The input is built here, next to the ref that drives it, so the ref never
   * has to travel across a component boundary. */
  const fileInput = (
    <input
      accept="image/jpeg,image/png,image/webp"
      aria-label={slot.label}
      className="sr-only"
      onChange={(event) => {
        upload.selectFile(event.target.files?.[0] ?? null);
        /* Let the same file be picked again after a cancel. */
        event.target.value = "";
      }}
      ref={inputRef}
      tabIndex={-1}
      type="file"
    />
  );

  return {
    assetId,
    /* While cropping, show the candidate; otherwise the published image. */
    displayedUrl: upload.previewUrl ?? slot.initialUrl,
    fileInput,
    isEditing,
    openPicker: () => inputRef.current?.click(),
    upload,
  };
}

type HeaderMediaSlot = ReturnType<typeof useHeaderMediaSlot>;

function CropDialog({
  slot,
  state,
}: {
  slot: SlotConfig;
  state: HeaderMediaSlot;
}) {
  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && !state.upload.isBusy) {
          state.upload.reset();
        }
      }}
      open={state.isEditing}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Ajustar {slot.label.toLowerCase()}</DialogTitle>
          <DialogDescription>
            Amplie e reposicione a imagem. O recorte final respeita o formato
            desta mídia.
          </DialogDescription>
        </DialogHeader>

        <MediaCropFields
          aspectClassName={cropAspectByPurpose[slot.purpose]}
          crop={state.upload.crop}
          previewUrl={state.upload.previewUrl}
          setCrop={state.upload.setCrop}
        />

        {state.upload.isBusy ? (
          <Progress
            aria-label="Progresso do envio"
            aria-live="polite"
            value={state.upload.progress}
          >
            <ProgressLabel>{state.upload.statusMessage}</ProgressLabel>
            <ProgressValue>{() => `${state.upload.progress}%`}</ProgressValue>
          </Progress>
        ) : null}

        {state.upload.error ? (
          <Alert aria-live="assertive" variant="destructive">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>Não foi possível concluir</AlertTitle>
            <AlertDescription>{state.upload.error}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <Button
            disabled={state.upload.isBusy}
            onClick={state.upload.reset}
            type="button"
            variant="ghost"
          >
            Cancelar
          </Button>
          <Button
            disabled={!state.upload.file || state.upload.isBusy}
            onClick={state.upload.upload}
            type="button"
          >
            {state.upload.isBusy ? (
              <Spinner aria-label="Enviando imagem" />
            ) : (
              <Upload aria-hidden="true" />
            )}
            {state.upload.isBusy ? "Enviando..." : "Salvar imagem"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The profile edit page's header: the same live preview the signup wizard
 * shows, but wired so clicking the cover or the avatar replaces it in place.
 */
export function ProfileHeaderMediaEditor({
  actions,
  avatar,
  badges,
  cover,
  displayName,
  initials,
  location,
  onProfileVersionChange,
}: {
  actions: MediaUploadActions;
  avatar: SlotConfig;
  badges: ProfileHeaderPreviewBadge[];
  cover: SlotConfig;
  displayName: string;
  initials: string;
  location: string;
  onProfileVersionChange: (version: number) => void;
}) {
  const avatarState = useHeaderMediaSlot({
    actions,
    onProfileVersionChange,
    slot: avatar,
  });
  const coverState = useHeaderMediaSlot({
    actions,
    onProfileVersionChange,
    slot: cover,
  });

  return (
    <div className="space-y-3">
      {avatarState.fileInput}
      {coverState.fileInput}

      <ProfileHeaderPreview
        avatarUrl={avatarState.displayedUrl}
        badges={badges}
        coverUrl={coverState.displayedUrl}
        displayName={displayName}
        initials={initials}
        location={location}
        onAvatarClick={avatarState.openPicker}
        onCoverClick={coverState.openPicker}
      />
      <p className="text-muted-foreground text-center text-xs">
        Toque ou clique na capa e na foto de perfil para trocá-las. A imagem é
        publicada assim que o envio termina.
      </p>

      <CropDialog slot={avatar} state={avatarState} />
      <CropDialog slot={cover} state={coverState} />
    </div>
  );
}

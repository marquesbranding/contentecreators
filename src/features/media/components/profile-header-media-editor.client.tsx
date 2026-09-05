"use client";

import { CircleAlert, Upload } from "lucide-react";

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

import {
  useHeaderMediaSlot,
  type HeaderMediaSlot,
  type HeaderMediaSlotConfig,
} from "../hooks/use-header-media-slot";
import { coverDisplayFrames } from "../domain/media-display-frames";
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

type SlotConfig = HeaderMediaSlotConfig;

export function CropDialog({
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
          displayFrames={
            slot.purpose === "COVER" ? coverDisplayFrames : undefined
          }
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
  activateOnUpload = true,
  avatar,
  badges,
  cover,
  displayName,
  helperText,
  initials,
  location,
  onProfileVersionChange,
}: {
  actions: MediaUploadActions;
  /** False before the profile exists yet (onboarding): uploads still happen
   * immediately, but the asset is only linked to the profile on submit, via
   * the hidden inputs each slot's `assetIdFieldName` renders. */
  activateOnUpload?: boolean;
  avatar: SlotConfig;
  badges: ProfileHeaderPreviewBadge[];
  cover: SlotConfig;
  displayName: string;
  helperText?: string;
  initials: string;
  location: string;
  onProfileVersionChange?: (version: number) => void;
}) {
  const avatarState = useHeaderMediaSlot({
    actions,
    activateOnUpload,
    onProfileVersionChange,
    slot: avatar,
  });
  const coverState = useHeaderMediaSlot({
    actions,
    activateOnUpload,
    onProfileVersionChange,
    slot: cover,
  });

  return (
    <div className="space-y-3">
      {avatarState.fileInput}
      {coverState.fileInput}
      {avatarState.hiddenAssetIdInput}
      {coverState.hiddenAssetIdInput}

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
        {helperText ??
          "Toque ou clique na capa e na foto de perfil para trocá-las. A imagem é publicada assim que o envio termina."}
      </p>

      <CropDialog slot={avatar} state={avatarState} />
      <CropDialog slot={cover} state={coverState} />
    </div>
  );
}

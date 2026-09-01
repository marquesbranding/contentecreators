"use client";

import { useRef, useState } from "react";

import { useMediaUpload } from "./use-media-upload";
import type {
  MediaPurpose,
  MediaUploadActions,
} from "../types/media-upload.types";

export interface HeaderMediaSlotConfig {
  /** When set, a hidden input with this name carries the asset id for a form
   * that doesn't activate the upload immediately (onboarding, pre-submit). */
  assetIdFieldName?: string;
  currentAssetId: string | null;
  initialUrl: string | null;
  label: string;
  purpose: MediaPurpose;
}

/**
 * Drives one image slot from a click on the header preview itself: the hidden
 * file input opens the picker, and the crop dialog opens as soon as a file is
 * chosen, so the whole flow happens where the user sees the image.
 */
export function useHeaderMediaSlot({
  actions,
  activateOnUpload = true,
  onProfileVersionChange,
  slot,
}: {
  actions: MediaUploadActions;
  activateOnUpload?: boolean;
  onProfileVersionChange?: (version: number) => void;
  slot: HeaderMediaSlotConfig;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [assetId, setAssetId] = useState(slot.currentAssetId);
  const upload = useMediaUpload({
    actions,
    activateOnUpload,
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
  const hiddenAssetIdInput =
    slot.assetIdFieldName && assetId ? (
      <input name={slot.assetIdFieldName} type="hidden" value={assetId} />
    ) : null;

  return {
    assetId,
    /** Drops the current selection entirely (not just an in-progress crop) —
     * distinct from `upload.reset`, which only cancels a pick-in-progress and
     * would otherwise fall back to showing the previously published image. */
    clear: () => {
      setAssetId(null);
      upload.reset();
    },
    /** Discards any in-progress or abandoned pick and returns to whatever
     * this slot started with — for a host component that stays mounted
     * across a dialog's open/close cycles (so no natural remount resets it). */
    resetToInitial: () => {
      setAssetId(slot.currentAssetId);
      upload.reset();
    },
    /* While cropping, always show the candidate; otherwise fall back to the
     * published image only if a selection still exists (a clear() call must
     * not resurrect it). */
    displayedUrl: upload.previewUrl ?? (assetId ? slot.initialUrl : null),
    fileInput,
    hiddenAssetIdInput,
    isEditing,
    openPicker: () => inputRef.current?.click(),
    upload,
  };
}

export type HeaderMediaSlot = ReturnType<typeof useHeaderMediaSlot>;

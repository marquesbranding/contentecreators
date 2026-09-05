"use client";

import { useId, useState } from "react";

import { Field, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/cn";

import type { ImageCropSettings } from "../domain/crop-image";
import type { MediaDisplayFrame } from "../domain/media-display-frames";

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

/**
 * The crop preview and its three sliders, without any dialog chrome — the
 * upload field and the profile header editor each wrap this in their own
 * surface.
 */
export function MediaCropFields({
  aspectClassName,
  crop,
  displayFrames,
  previewUrl,
  setCrop,
}: {
  aspectClassName: string;
  crop: ImageCropSettings;
  /** Marks the area that is really shown at each breakpoint, with a tab to
   * switch between them — the working area stays wider so there is room to
   * reposition, and only the masked band ends up visible in production. */
  displayFrames?: Readonly<Record<string, MediaDisplayFrame>>;
  previewUrl: string | null;
  setCrop: (updater: (current: ImageCropSettings) => ImageCropSettings) => void;
}) {
  const frameEntries = displayFrames ? Object.entries(displayFrames) : [];
  const [activeFrameKey, setActiveFrameKey] = useState(
    frameEntries[0]?.[0] ?? "",
  );
  const activeFrame = displayFrames?.[activeFrameKey] ?? frameEntries[0]?.[1];

  return (
    <div className="grid gap-5">
      {frameEntries.length > 0 ? (
        <div className="flex justify-center gap-1" role="tablist">
          {frameEntries.map(([key, frame]) => (
            <button
              aria-selected={key === activeFrameKey}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                key === activeFrameKey
                  ? "bg-brand-blue text-white"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
              key={key}
              onClick={() => setActiveFrameKey(key)}
              role="tab"
              type="button"
            >
              {frame.label}
            </button>
          ))}
        </div>
      ) : null}
      <div
        className={cn(
          "bg-muted relative mx-auto w-full max-w-md overflow-hidden rounded-xl border",
          aspectClassName,
        )}
      >
        {/* Blob previews cannot use next/image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          aria-hidden="true"
          className="size-full object-cover"
          src={previewUrl ?? undefined}
          style={{
            objectPosition: `${crop.horizontal}% ${crop.vertical}%`,
            transform: `scale(${crop.zoom})`,
          }}
        />
        {activeFrame ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col">
            <div className="flex-1 bg-black/45" />
            <div
              className="relative w-full shrink-0 border-2 border-dashed border-white/90"
              style={{ aspectRatio: activeFrame.ratio }}
            >
              <span className="absolute inset-x-0 top-1 text-center text-[10px] font-semibold text-white drop-shadow">
                Área visível no seu perfil
              </span>
            </div>
            <div className="flex-1 bg-black/45" />
          </div>
        ) : null}
      </div>
      <CropControl
        label="Ampliação"
        max={2}
        min={1}
        onChange={(zoom) => setCrop((current) => ({ ...current, zoom }))}
        step={0.1}
        value={crop.zoom}
      />
      <CropControl
        label="Posição horizontal"
        max={100}
        min={0}
        onChange={(horizontal) =>
          setCrop((current) => ({ ...current, horizontal }))
        }
        step={1}
        value={crop.horizontal}
      />
      <CropControl
        label="Posição vertical"
        max={100}
        min={0}
        onChange={(vertical) =>
          setCrop((current) => ({ ...current, vertical }))
        }
        step={1}
        value={crop.vertical}
      />
    </div>
  );
}

"use client";

import { useId } from "react";

import { Field, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/cn";

import type { ImageCropSettings } from "../domain/crop-image";

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
  previewUrl,
  setCrop,
}: {
  aspectClassName: string;
  crop: ImageCropSettings;
  previewUrl: string | null;
  setCrop: (updater: (current: ImageCropSettings) => ImageCropSettings) => void;
}) {
  return (
    <div className="grid gap-5">
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

"use client";

import type { MediaPurpose } from "../types/media-upload.types";

export interface ImageCropSettings {
  horizontal: number;
  vertical: number;
  zoom: number;
}

const aspectRatioByPurpose: Readonly<Record<MediaPurpose, number>> = {
  AVATAR: 1,
  COVER: 16 / 9,
  LOGO: 1,
  SPONSORSHIP_CREATIVE: 16 / 9,
};

function outputDimensions(
  cropWidth: number,
  cropHeight: number,
  aspectRatio: number,
) {
  if (aspectRatio === 1) {
    const size = Math.max(1, Math.min(1080, Math.floor(cropWidth)));

    return { height: size, width: size };
  }

  const width = Math.max(1, Math.min(1600, Math.floor(cropWidth)));

  return {
    height: Math.max(1, Math.floor(width / aspectRatio)),
    width,
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas could not encode the cropped image."));
        }
      },
      mimeType,
      mimeType === "image/png" ? undefined : 0.9,
    );
  });
}

export async function cropImageFile(
  file: File,
  purpose: MediaPurpose,
  settings: ImageCropSettings,
  requestedAspectRatio?: number,
): Promise<File> {
  const image = await createImageBitmap(file);

  try {
    const aspectRatio =
      purpose === "SPONSORSHIP_CREATIVE" &&
      requestedAspectRatio &&
      Number.isFinite(requestedAspectRatio) &&
      requestedAspectRatio > 0
        ? requestedAspectRatio
        : aspectRatioByPurpose[purpose];
    const sourceAspectRatio = image.width / image.height;
    const baseCropWidth =
      sourceAspectRatio > aspectRatio
        ? image.height * aspectRatio
        : image.width;
    const baseCropHeight =
      sourceAspectRatio > aspectRatio
        ? image.height
        : image.width / aspectRatio;
    const zoom = Math.min(2, Math.max(1, settings.zoom));
    const cropWidth = baseCropWidth / zoom;
    const cropHeight = baseCropHeight / zoom;
    const horizontal = Math.min(100, Math.max(0, settings.horizontal));
    const vertical = Math.min(100, Math.max(0, settings.vertical));
    const sourceX = (image.width - cropWidth) * (horizontal / 100);
    const sourceY = (image.height - cropHeight) * (vertical / 100);
    const dimensions = outputDimensions(cropWidth, cropHeight, aspectRatio);
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas 2D context is unavailable.");
    }

    context.drawImage(
      image,
      sourceX,
      sourceY,
      cropWidth,
      cropHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    // WebP keeps transparency and stays far below the upload limit even for
    // 4K phone photos; browsers without a WebP encoder keep the source type.
    const webp = await canvasToBlob(canvas, "image/webp").catch(() => null);
    const blob =
      webp?.type === "image/webp"
        ? webp
        : await canvasToBlob(canvas, file.type);
    const fileName =
      blob.type === "image/webp"
        ? `${file.name.replace(/\.[^.]+$/u, "") || "imagem"}.webp`
        : file.name;

    return new File([blob], fileName, {
      lastModified: Date.now(),
      type: blob.type || file.type,
    });
  } finally {
    image.close();
  }
}

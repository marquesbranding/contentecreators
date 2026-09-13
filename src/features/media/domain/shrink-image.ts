"use client";

// Server Actions receive the whole registration form in one request, so images
// picked straight from a phone camera must be shrunk before they are sent.
export const SHRINK_IMAGE_TARGET_BYTES = 900 * 1024;

const MAX_DIMENSION = 1600;
const OUTPUT_QUALITY = 0.85;

function encodeCanvas(canvas: HTMLCanvasElement, mimeType: string) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mimeType, OUTPUT_QUALITY);
  });
}

function replaceExtension(fileName: string, extension: string) {
  const baseName = fileName.replace(/\.[^.]+$/u, "") || "imagem";

  return `${baseName}.${extension}`;
}

export async function shrinkImageFile(file: File): Promise<File> {
  if (file.size <= SHRINK_IMAGE_TARGET_BYTES) {
    return file;
  }

  let image: ImageBitmap;

  try {
    image = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(image.width, image.height),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");

    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    // WebP keeps logo transparency; browsers without a WebP encoder fall back to PNG.
    const webp = await encodeCanvas(canvas, "image/webp");
    const blob =
      webp?.type === "image/webp"
        ? webp
        : await encodeCanvas(canvas, "image/jpeg");

    if (!blob || blob.size >= file.size) {
      return file;
    }

    const extension = blob.type === "image/webp" ? "webp" : "jpg";

    return new File([blob], replaceExtension(file.name, extension), {
      lastModified: Date.now(),
      type: blob.type,
    });
  } finally {
    image.close();
  }
}

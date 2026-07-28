export type ImageUploadPurpose =
  "AVATAR" | "LOGO" | "COVER" | "SPONSORSHIP_CREATIVE";

export type SupportedImageMimeType = "image/jpeg" | "image/png" | "image/webp";

const mebibyte = 1024 * 1024;
const maxImageDimension = 16_384;
const maxImagePixels = 40_000_000;

export const IMAGE_UPLOAD_LIMITS: Readonly<Record<ImageUploadPurpose, number>> =
  {
    AVATAR: 5 * mebibyte,
    COVER: 8 * mebibyte,
    LOGO: 5 * mebibyte,
    SPONSORSHIP_CREATIVE: 8 * mebibyte,
  };

const extensionsByMimeType: Readonly<
  Record<SupportedImageMimeType, readonly string[]>
> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
};

interface ImageUploadDeclarationInput {
  declaredMimeType: string;
  fileName: string;
  purpose: ImageUploadPurpose;
  sizeBytes: number;
}

interface ImageUploadInput extends ImageUploadDeclarationInput {
  headerBytes: Uint8Array;
}

export type ImageUploadDeclarationResult =
  | {
      ok: true;
      value: {
        extension: string;
        maxBytes: number;
        mimeType: SupportedImageMimeType;
        sizeBytes: number;
      };
    }
  | {
      code:
        "EMPTY_FILE" | "UNSUPPORTED_DECLARED_MIME" | "UNSUPPORTED_EXTENSION";
      ok: false;
    }
  | {
      code: "FILE_TOO_LARGE";
      maxBytes: number;
      ok: false;
    };

export type ImageUploadValidationResult =
  | Extract<ImageUploadDeclarationResult, { ok: true }>
  | {
      code: "EXTENSION_MISMATCH" | "UNSUPPORTED_IMAGE_SIGNATURE";
      ok: false;
    }
  | Exclude<ImageUploadDeclarationResult, { ok: true }>
  | {
      actualMimeType: SupportedImageMimeType;
      code: "MIME_SIGNATURE_MISMATCH";
      ok: false;
    }
  | {
      code: "FILE_TOO_LARGE";
      maxBytes: number;
      ok: false;
    };

function startsWithBytes(bytes: Uint8Array, signature: readonly number[]) {
  return (
    bytes.length >= signature.length &&
    signature.every((byte, index) => bytes[index] === byte)
  );
}

function boundedDimensions(width: number, height: number) {
  return Number.isInteger(width) &&
    Number.isInteger(height) &&
    width > 0 &&
    height > 0 &&
    width <= maxImageDimension &&
    height <= maxImageDimension &&
    width * height <= maxImagePixels
    ? { height, width }
    : null;
}

function readUint16BigEndian(bytes: Uint8Array, offset: number) {
  return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
}

function readUint24LittleEndian(bytes: Uint8Array, offset: number) {
  return (
    (bytes[offset] ?? 0) |
    ((bytes[offset + 1] ?? 0) << 8) |
    ((bytes[offset + 2] ?? 0) << 16)
  );
}

function extractJpegDimensions(bytes: Uint8Array) {
  if (!startsWithBytes(bytes, [0xff, 0xd8])) {
    return null;
  }

  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
    0xcf,
  ]);
  let offset = 2;

  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    while (bytes[offset] === 0xff) {
      offset += 1;
    }

    const marker = bytes[offset];
    offset += 1;

    if (marker === undefined || marker === 0xd9 || marker === 0xda) {
      break;
    }

    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      continue;
    }

    const segmentLength = readUint16BigEndian(bytes, offset);

    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      return null;
    }

    if (startOfFrameMarkers.has(marker)) {
      return boundedDimensions(
        readUint16BigEndian(bytes, offset + 5),
        readUint16BigEndian(bytes, offset + 3),
      );
    }

    offset += segmentLength;
  }

  return null;
}

function extractPngDimensions(bytes: Uint8Array) {
  if (
    bytes.length < 24 ||
    !startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) ||
    !startsWithBytes(bytes.slice(12), [0x49, 0x48, 0x44, 0x52])
  ) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  return boundedDimensions(view.getUint32(16), view.getUint32(20));
}

function extractWebpDimensions(bytes: Uint8Array) {
  if (
    bytes.length < 25 ||
    !startsWithBytes(bytes, [0x52, 0x49, 0x46, 0x46]) ||
    !startsWithBytes(bytes.slice(8), [0x57, 0x45, 0x42, 0x50])
  ) {
    return null;
  }

  const chunkType = String.fromCharCode(...bytes.slice(12, 16));

  if (chunkType === "VP8X" && bytes.length >= 30) {
    return boundedDimensions(
      readUint24LittleEndian(bytes, 24) + 1,
      readUint24LittleEndian(bytes, 27) + 1,
    );
  }

  if (
    chunkType === "VP8 " &&
    bytes.length >= 30 &&
    startsWithBytes(bytes.slice(23), [0x9d, 0x01, 0x2a])
  ) {
    return boundedDimensions(
      (((bytes[27] ?? 0) << 8) | (bytes[26] ?? 0)) & 0x3fff,
      (((bytes[29] ?? 0) << 8) | (bytes[28] ?? 0)) & 0x3fff,
    );
  }

  if (chunkType === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
    const first = bytes[21] ?? 0;
    const second = bytes[22] ?? 0;
    const third = bytes[23] ?? 0;
    const fourth = bytes[24] ?? 0;

    return boundedDimensions(
      1 + first + ((second & 0x3f) << 8),
      1 + (second >> 6) + (third << 2) + ((fourth & 0x0f) << 10),
    );
  }

  return null;
}

export function extractImageDimensions(
  bytes: Uint8Array,
  mimeType: SupportedImageMimeType,
) {
  if (mimeType === "image/jpeg") {
    return extractJpegDimensions(bytes);
  }

  if (mimeType === "image/png") {
    return extractPngDimensions(bytes);
  }

  return extractWebpDimensions(bytes);
}

function detectMimeType(
  headerBytes: Uint8Array,
): SupportedImageMimeType | null {
  if (startsWithBytes(headerBytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }

  if (
    startsWithBytes(
      headerBytes,
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    )
  ) {
    return "image/png";
  }

  const isWebp =
    startsWithBytes(headerBytes, [0x52, 0x49, 0x46, 0x46]) &&
    headerBytes.length >= 12 &&
    startsWithBytes(headerBytes.slice(8), [0x57, 0x45, 0x42, 0x50]);

  return isWebp ? "image/webp" : null;
}

function extractSupportedExtension(fileName: string) {
  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  const extension = match?.[1]?.toLowerCase();

  if (
    !extension ||
    !Object.values(extensionsByMimeType).some((extensions) =>
      extensions.includes(extension),
    )
  ) {
    return null;
  }

  return extension;
}

function isSupportedMimeType(
  mimeType: string,
): mimeType is SupportedImageMimeType {
  return Object.hasOwn(extensionsByMimeType, mimeType);
}

export function validateImageUpload({
  declaredMimeType,
  fileName,
  headerBytes,
  purpose,
  sizeBytes,
}: ImageUploadInput): ImageUploadValidationResult {
  const declaration = validateImageUploadDeclaration({
    declaredMimeType,
    fileName,
    purpose,
    sizeBytes,
  });

  if (!declaration.ok) {
    return declaration;
  }

  const actualMimeType = detectMimeType(headerBytes);

  if (!actualMimeType) {
    return {
      code: "UNSUPPORTED_IMAGE_SIGNATURE",
      ok: false,
    };
  }

  if (actualMimeType !== declaration.value.mimeType) {
    return {
      actualMimeType,
      code: "MIME_SIGNATURE_MISMATCH",
      ok: false,
    };
  }

  if (
    !extensionsByMimeType[actualMimeType].includes(declaration.value.extension)
  ) {
    return {
      code: "EXTENSION_MISMATCH",
      ok: false,
    };
  }

  return declaration;
}

export function validateImageUploadDeclaration({
  declaredMimeType,
  fileName,
  purpose,
  sizeBytes,
}: ImageUploadDeclarationInput): ImageUploadDeclarationResult {
  if (sizeBytes <= 0) {
    return {
      code: "EMPTY_FILE",
      ok: false,
    };
  }

  const maxBytes = IMAGE_UPLOAD_LIMITS[purpose];

  if (sizeBytes > maxBytes) {
    return {
      code: "FILE_TOO_LARGE",
      maxBytes,
      ok: false,
    };
  }

  const normalizedDeclaredMimeType = declaredMimeType.trim().toLowerCase();

  if (!isSupportedMimeType(normalizedDeclaredMimeType)) {
    return {
      code: "UNSUPPORTED_DECLARED_MIME",
      ok: false,
    };
  }

  const extension = extractSupportedExtension(fileName);

  if (!extension) {
    return {
      code: "UNSUPPORTED_EXTENSION",
      ok: false,
    };
  }

  return {
    ok: true,
    value: {
      extension,
      maxBytes,
      mimeType: normalizedDeclaredMimeType,
      sizeBytes,
    },
  };
}

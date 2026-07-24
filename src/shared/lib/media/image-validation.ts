export type ImageUploadPurpose =
  "AVATAR" | "LOGO" | "COVER" | "SPONSORSHIP_CREATIVE";

export type SupportedImageMimeType = "image/jpeg" | "image/png" | "image/webp";

const mebibyte = 1024 * 1024;

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

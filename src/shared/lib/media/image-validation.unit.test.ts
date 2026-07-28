import { describe, expect, it } from "vitest";

import {
  extractImageDimensions,
  IMAGE_UPLOAD_LIMITS,
  validateImageUpload,
} from "./image-validation";

const headers = {
  jpeg: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
  png: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  webp: new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x24, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
  ]),
};

describe("image upload validation", () => {
  it.each([
    {
      bytes: new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49,
        0x48, 0x44, 0x52, 0, 0, 0x05, 0, 0, 0, 0x02, 0xd0,
      ]),
      mimeType: "image/png" as const,
    },
    {
      bytes: new Uint8Array([
        0xff, 0xd8, 0xff, 0xc0, 0, 0x11, 0x08, 0x02, 0xd0, 0x05, 0, 0x03, 0x01,
        0x11, 0, 0x02, 0x11, 0, 0x03, 0x11, 0,
      ]),
      mimeType: "image/jpeg" as const,
    },
    {
      bytes: new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x16, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56,
        0x50, 0x38, 0x58, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0xff, 0x04, 0, 0xcf, 0x02,
        0,
      ]),
      mimeType: "image/webp" as const,
    },
  ])(
    "extracts bounded dimensions from $mimeType bytes",
    ({ bytes, mimeType }) => {
      expect(extractImageDimensions(bytes, mimeType)).toEqual({
        height: 720,
        width: 1280,
      });
    },
  );

  it("rejects missing and implausibly large encoded dimensions", () => {
    expect(extractImageDimensions(headers.png, "image/png")).toBeNull();
    expect(
      extractImageDimensions(
        new Uint8Array([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49,
          0x48, 0x44, 0x52, 0, 1, 0, 0, 0, 1, 0, 0,
        ]),
        "image/png",
      ),
    ).toBeNull();
  });

  it.each([
    {
      declaredMimeType: "image/jpeg",
      expectedExtension: "jpg",
      expectedMimeType: "image/jpeg",
      fileName: "avatar.JPG",
      headerBytes: headers.jpeg,
    },
    {
      declaredMimeType: "image/jpeg",
      expectedExtension: "jpeg",
      expectedMimeType: "image/jpeg",
      fileName: "logo.jpeg",
      headerBytes: headers.jpeg,
    },
    {
      declaredMimeType: "image/png",
      expectedExtension: "png",
      expectedMimeType: "image/png",
      fileName: "cover.png",
      headerBytes: headers.png,
    },
    {
      declaredMimeType: "image/webp",
      expectedExtension: "webp",
      expectedMimeType: "image/webp",
      fileName: "creative.webp",
      headerBytes: headers.webp,
    },
  ])(
    "accepts $expectedMimeType bytes with .$expectedExtension",
    ({
      declaredMimeType,
      expectedExtension,
      expectedMimeType,
      fileName,
      headerBytes,
    }) => {
      expect(
        validateImageUpload({
          declaredMimeType,
          fileName,
          headerBytes,
          purpose: "AVATAR",
          sizeBytes: 1024,
        }),
      ).toEqual({
        ok: true,
        value: {
          extension: expectedExtension,
          maxBytes: IMAGE_UPLOAD_LIMITS.AVATAR,
          mimeType: expectedMimeType,
          sizeBytes: 1024,
        },
      });
    },
  );

  it.each([
    ["AVATAR", 5 * 1024 * 1024],
    ["LOGO", 5 * 1024 * 1024],
    ["COVER", 8 * 1024 * 1024],
    ["SPONSORSHIP_CREATIVE", 8 * 1024 * 1024],
  ] as const)("enforces the exact %s byte limit", (purpose, maxBytes) => {
    expect(IMAGE_UPLOAD_LIMITS[purpose]).toBe(maxBytes);
    expect(
      validateImageUpload({
        declaredMimeType: "image/png",
        fileName: "boundary.png",
        headerBytes: headers.png,
        purpose,
        sizeBytes: maxBytes,
      }).ok,
    ).toBe(true);
    expect(
      validateImageUpload({
        declaredMimeType: "image/png",
        fileName: "too-large.png",
        headerBytes: headers.png,
        purpose,
        sizeBytes: maxBytes + 1,
      }),
    ).toEqual({
      code: "FILE_TOO_LARGE",
      maxBytes,
      ok: false,
    });
  });

  it("rejects a declared MIME that differs from the byte signature", () => {
    expect(
      validateImageUpload({
        declaredMimeType: "image/png",
        fileName: "renamed.png",
        headerBytes: headers.jpeg,
        purpose: "LOGO",
        sizeBytes: 1024,
      }),
    ).toEqual({
      actualMimeType: "image/jpeg",
      code: "MIME_SIGNATURE_MISMATCH",
      ok: false,
    });
  });

  it("rejects an extension that does not match the validated MIME", () => {
    expect(
      validateImageUpload({
        declaredMimeType: "image/webp",
        fileName: "renamed.png",
        headerBytes: headers.webp,
        purpose: "COVER",
        sizeBytes: 1024,
      }),
    ).toEqual({
      code: "EXTENSION_MISMATCH",
      ok: false,
    });
  });

  it.each([
    {
      declaredMimeType: "image/svg+xml",
      expectedCode: "UNSUPPORTED_DECLARED_MIME",
      fileName: "vector.svg",
      headerBytes: new Uint8Array([0x3c, 0x73, 0x76, 0x67]),
    },
    {
      declaredMimeType: "image/png",
      expectedCode: "UNSUPPORTED_IMAGE_SIGNATURE",
      fileName: "fake.png",
      headerBytes: new Uint8Array([0x3c, 0x73, 0x76, 0x67]),
    },
    {
      declaredMimeType: "image/png",
      expectedCode: "UNSUPPORTED_EXTENSION",
      fileName: "no-extension",
      headerBytes: headers.png,
    },
  ])(
    "returns $expectedCode for an unsupported representation",
    ({ declaredMimeType, expectedCode, fileName, headerBytes }) => {
      expect(
        validateImageUpload({
          declaredMimeType,
          fileName,
          headerBytes,
          purpose: "AVATAR",
          sizeBytes: 1024,
        }),
      ).toEqual({
        code: expectedCode,
        ok: false,
      });
    },
  );

  it("rejects an empty file before inspecting its representation", () => {
    expect(
      validateImageUpload({
        declaredMimeType: "image/png",
        fileName: "empty.png",
        headerBytes: new Uint8Array(),
        purpose: "AVATAR",
        sizeBytes: 0,
      }),
    ).toEqual({
      code: "EMPTY_FILE",
      ok: false,
    });
  });
});

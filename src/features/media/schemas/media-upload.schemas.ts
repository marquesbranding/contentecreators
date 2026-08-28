import { z } from "zod";

export const mediaPurposeSchema = z.enum([
  "AVATAR",
  "LOGO",
  "COVER",
  "SPONSORSHIP_CREATIVE",
]);

export const mediaBucketNameSchema = z.enum([
  "profile-media",
  "sponsorship-media",
]);

export const prepareMediaUploadSchema = z.object({
  declaredMimeType: z.string().trim().min(1).max(100),
  fileName: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .refine((value) => !value.includes("/") && !value.includes("\\")),
  purpose: mediaPurposeSchema,
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(8 * 1024 * 1024),
});

export const finalizeMediaUploadSchema = z.object({
  bucketName: mediaBucketNameSchema,
  objectPath: z
    .string()
    .trim()
    .min(3)
    .max(1024)
    .refine(
      (value) =>
        !value.startsWith("/") &&
        !value.includes("..") &&
        !value.includes("//"),
    ),
  purpose: mediaPurposeSchema,
});

export const activateProfileMediaSchema = z.object({
  assetId: z.uuid(),
  expectedCurrentAssetId: z.uuid().nullable(),
  purpose: mediaPurposeSchema.exclude(["SPONSORSHIP_CREATIVE"]),
});

export const removeProfileMediaSchema = z.object({
  purpose: mediaPurposeSchema.exclude(["SPONSORSHIP_CREATIVE"]),
});

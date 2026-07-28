import "server-only";

import { z } from "zod";

import { createEnvironmentError } from "@/shared/lib/env/env-error";

const publicSupportContactSchema = z.object({
  SUPPORT_CONTACT_EMAIL: z.email().optional(),
});

export function parsePublicSupportContact(
  input: Record<string, unknown>,
): string | null {
  const result = publicSupportContactSchema.safeParse(input);

  if (!result.success) {
    throw createEnvironmentError("server", result.error);
  }

  return result.data.SUPPORT_CONTACT_EMAIL ?? null;
}

export function loadPublicSupportContact() {
  return parsePublicSupportContact({
    SUPPORT_CONTACT_EMAIL: process.env.SUPPORT_CONTACT_EMAIL,
  });
}

"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { createServerWhatsappContactRepository } from "../repositories/drizzle-whatsapp-contact.repository";
import type { ConfirmWhatsappContactActionResult } from "../../types/whatsapp-contact.types";

/**
 * Fired the moment a company clicks "Chamar no WhatsApp" — best-effort, since
 * the actual WhatsApp link already opened in a new tab and nothing here
 * should ever block or surface an error over that navigation.
 */
export async function recordWhatsappContactClickAction(
  creatorProfileId: string,
) {
  try {
    const repository = await createServerWhatsappContactRepository();

    await repository.recordClick({
      creatorProfileId,
      requestId: crypto.randomUUID(),
    });
  } catch {
    // Intentionally swallowed — see the comment above.
  }
}

export async function confirmWhatsappContactAction(
  confirmationId: string,
): Promise<ConfirmWhatsappContactActionResult> {
  try {
    const repository = await createServerWhatsappContactRepository();
    const result = await repository.confirm({
      confirmationId,
      requestId: crypto.randomUUID(),
    });

    revalidatePath("/app/catalog");

    return { kind: "confirmed", ...result };
  } catch {
    return { kind: "error" };
  }
}

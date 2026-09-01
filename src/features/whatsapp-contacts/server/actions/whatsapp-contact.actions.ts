"use server";

import "server-only";

import { createServerWhatsappContactRepository } from "../repositories/drizzle-whatsapp-contact.repository";

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

export async function confirmWhatsappContactAction(confirmationId: string) {
  const repository = await createServerWhatsappContactRepository();

  return repository.confirm({
    confirmationId,
    requestId: crypto.randomUUID(),
  });
}

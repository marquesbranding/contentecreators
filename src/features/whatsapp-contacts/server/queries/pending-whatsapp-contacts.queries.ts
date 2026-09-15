import "server-only";

import { VerifiedAccountTransactionError } from "@/features/identity/server";

import { createServerWhatsappContactRepository } from "../repositories/drizzle-whatsapp-contact.repository";

export async function loadPendingWhatsappContactConfirmations() {
  const repository = await createServerWhatsappContactRepository();

  try {
    return await repository.listPending({ requestId: crypto.randomUUID() });
  } catch (error) {
    /* The app layout also wraps public status pages (e.g. /app/status/blocked)
     * that render without a session; there is nothing pending to confirm. */
    if (
      error instanceof VerifiedAccountTransactionError &&
      error.code === "UNAUTHENTICATED"
    ) {
      return [];
    }

    throw error;
  }
}

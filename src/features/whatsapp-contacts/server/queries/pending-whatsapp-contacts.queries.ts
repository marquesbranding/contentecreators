import "server-only";

import { createServerWhatsappContactRepository } from "../repositories/drizzle-whatsapp-contact.repository";

export async function loadPendingWhatsappContactConfirmations() {
  const repository = await createServerWhatsappContactRepository();

  return repository.listPending({ requestId: crypto.randomUUID() });
}

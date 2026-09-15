"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { operationalLogger } from "@/shared/server/observability/operational-logger";

import { createServerWhatsappContactRepository } from "../repositories/drizzle-whatsapp-contact.repository";
import type { ConfirmWhatsappContactActionResult } from "../../types/whatsapp-contact.types";

function logWhatsappFailure(
  operation: string,
  requestId: string,
  error: unknown,
) {
  operationalLogger.error({
    details: {
      errorMessage: error instanceof Error ? error.message : String(error),
    },
    event: "user_facing_error",
    operation,
    outcome: "error",
    requestId,
  });
}

/**
 * Fired the moment a company clicks "Chamar no WhatsApp" — best-effort, since
 * the actual WhatsApp link already opened in a new tab and nothing here
 * should ever block or surface an error over that navigation.
 */
export async function recordWhatsappContactClickAction(
  creatorProfileId: string,
) {
  const requestId = crypto.randomUUID();

  try {
    const repository = await createServerWhatsappContactRepository();

    await repository.recordClick({
      creatorProfileId,
      requestId,
    });
  } catch (error) {
    logWhatsappFailure("record_whatsapp_contact_click", requestId, error);
  }
}

export async function confirmWhatsappContactAction(
  confirmationId: string,
): Promise<ConfirmWhatsappContactActionResult> {
  const requestId = crypto.randomUUID();

  try {
    const repository = await createServerWhatsappContactRepository();
    const result = await repository.confirm({
      confirmationId,
      requestId,
    });

    revalidatePath("/app/catalog");

    return { kind: "confirmed", ...result };
  } catch (error) {
    logWhatsappFailure("confirm_whatsapp_contact", requestId, error);

    return { kind: "error" };
  }
}

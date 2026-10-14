"use server";

import "server-only";

import { z } from "zod";

import { operationalLogger } from "@/shared/server/observability/operational-logger";

import { createServerLegalAcceptanceRepository } from "../repositories/drizzle-legal-acceptance.repository";
import type { AcceptLegalDocumentsActionResult } from "../../types/legal-acceptance.types";

const acceptLegalDocumentsInputSchema = z.object({
  documentIds: z.array(z.uuid()).min(1).max(5),
});

export type AcceptLegalDocumentsInput = z.input<
  typeof acceptLegalDocumentsInputSchema
>;

/**
 * Records consent to the documents the modal showed. Rejects (as `stale`) when
 * a newer version became active after the modal was rendered.
 */
export async function acceptLegalDocumentsAction(
  input: AcceptLegalDocumentsInput,
): Promise<AcceptLegalDocumentsActionResult> {
  const requestId = crypto.randomUUID();

  try {
    const parsed = acceptLegalDocumentsInputSchema.parse(input);
    const repository = await createServerLegalAcceptanceRepository();

    return await repository.accept({
      documentIds: parsed.documentIds,
      requestId,
    });
  } catch (error) {
    operationalLogger.error({
      details: {
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      event: "user_facing_error",
      operation: "accept_legal_documents",
      outcome: "error",
      requestId,
    });

    return { kind: "error" };
  }
}

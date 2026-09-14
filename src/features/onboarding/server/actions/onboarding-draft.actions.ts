"use server";

import { operationalLogger } from "@/shared/server/observability/operational-logger";

import { onboardingDraftSaveSchema } from "../../schemas/onboarding-draft-schema";
import type { OnboardingDraftActionResult } from "../../types/onboarding-draft.types";
import { OnboardingDraftError } from "../services/onboarding-draft.service";
import { createServerOnboardingDraftService } from "../services/server-onboarding-draft.service";

export async function saveOnboardingDraftAction(
  input: unknown,
): Promise<OnboardingDraftActionResult> {
  const parsed = onboardingDraftSaveSchema.safeParse(input);

  if (!parsed.success) {
    return {
      kind: "invalid" as const,
      message: "Revise os dados do rascunho antes de salvar.",
    };
  }

  const requestId = crypto.randomUUID();

  try {
    const service = await createServerOnboardingDraftService();
    const result = await service.saveOwnerDraft({
      ...parsed.data,
      requestId,
    });

    if (result.kind === "conflict") {
      return result;
    }

    return {
      draft: {
        ...result.draft,
        updatedAt: result.draft.updatedAt.toISOString(),
      },
      kind: "saved" as const,
    };
  } catch (error) {
    if (error instanceof OnboardingDraftError) {
      return {
        kind: "forbidden" as const,
        message:
          "Este rascunho não pode ser alterado no estado atual do cadastro.",
      };
    }

    operationalLogger.error({
      details: {
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      event: "user_facing_error",
      operation: "save_onboarding_draft",
      outcome: "error",
      requestId,
    });

    return {
      kind: "unavailable" as const,
      message: "Não foi possível salvar o rascunho agora. Tente novamente.",
    };
  }
}

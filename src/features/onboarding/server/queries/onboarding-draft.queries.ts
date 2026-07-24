import "server-only";

import type { OnboardingDraftClientDto } from "../../types/onboarding-draft.types";
import { createServerOnboardingDraftService } from "../services/server-onboarding-draft.service";

export async function loadCurrentOnboardingDraft(): Promise<OnboardingDraftClientDto | null> {
  const service = await createServerOnboardingDraftService();
  const draft = await service.loadOwnerDraft({
    requestId: crypto.randomUUID(),
  });

  return draft
    ? {
        ...draft,
        updatedAt: draft.updatedAt.toISOString(),
      }
    : null;
}

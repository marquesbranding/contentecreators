import "server-only";

import { createServerVerifiedAccountTransactionRunner } from "@/features/identity/server";

import { createDrizzleOnboardingDraftRepository } from "../repositories/drizzle-onboarding-draft.repository";
import { createOnboardingDraftService } from "./onboarding-draft.service";

export async function createServerOnboardingDraftService() {
  return createOnboardingDraftService({
    repository: createDrizzleOnboardingDraftRepository(),
    runOwnerTransaction: await createServerVerifiedAccountTransactionRunner(),
  });
}

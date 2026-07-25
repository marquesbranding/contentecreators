import "server-only";

import { createServerEmailDeliveryProcessor } from "@/features/communications/server";
import { createServerVerifiedAccountTransactionRunner } from "@/features/identity/server";

import { createDrizzleCorrectedProfileResubmissionRepository } from "../repositories/drizzle-corrected-profile-resubmission.repository";
import { createCorrectedProfileResubmissionService } from "./corrected-profile-resubmission.service";

export async function createServerCorrectedProfileResubmissionService() {
  return createCorrectedProfileResubmissionService({
    emailDelivery: createServerEmailDeliveryProcessor(),
    repository: createDrizzleCorrectedProfileResubmissionRepository(),
    runVerifiedTransaction:
      await createServerVerifiedAccountTransactionRunner(),
  });
}

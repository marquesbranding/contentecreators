import "server-only";

import { createServerVerifiedAccountTransactionRunner } from "@/features/identity/server";

import { createDrizzleCorrectedProfileResubmissionRepository } from "../repositories/drizzle-corrected-profile-resubmission.repository";
import { createCorrectedProfileResubmissionService } from "./corrected-profile-resubmission.service";

export async function createServerCorrectedProfileResubmissionService() {
  return createCorrectedProfileResubmissionService({
    repository: createDrizzleCorrectedProfileResubmissionRepository(),
    runVerifiedTransaction:
      await createServerVerifiedAccountTransactionRunner(),
  });
}

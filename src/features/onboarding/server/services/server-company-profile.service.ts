import "server-only";

import { createServerVerifiedAccountTransactionRunner } from "@/features/identity/server";

import { createDrizzleCompanyProfileRepository } from "../repositories/drizzle-company-profile.repository";
import { createCompanyProfileService } from "./company-profile.service";

export async function createServerCompanyProfileService() {
  return createCompanyProfileService({
    repository: createDrizzleCompanyProfileRepository(),
    runVerifiedTransaction:
      await createServerVerifiedAccountTransactionRunner(),
  });
}

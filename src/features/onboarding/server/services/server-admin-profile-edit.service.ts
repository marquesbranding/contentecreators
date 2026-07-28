import "server-only";

import { createServerVerifiedAccountTransactionRunner } from "@/features/identity/server";

import { createDrizzleAdminProfileTargetRepository } from "../repositories/drizzle-admin-profile-target.repository";
import { createDrizzleCompanyProfileRepository } from "../repositories/drizzle-company-profile.repository";
import { createDrizzleInfluencerProfileRepository } from "../repositories/drizzle-influencer-profile.repository";
import { createAdminProfileEditService } from "./admin-profile-edit.service";

export async function createServerAdminProfileEditService() {
  return createAdminProfileEditService({
    companyProfiles: createDrizzleCompanyProfileRepository(),
    influencerProfiles: createDrizzleInfluencerProfileRepository(),
    runVerifiedTransaction:
      await createServerVerifiedAccountTransactionRunner(),
    targets: createDrizzleAdminProfileTargetRepository(),
  });
}

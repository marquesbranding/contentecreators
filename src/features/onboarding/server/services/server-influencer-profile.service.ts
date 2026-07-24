import "server-only";

import { createServerVerifiedAccountTransactionRunner } from "@/features/identity/server";

import { createDrizzleInfluencerProfileRepository } from "../repositories/drizzle-influencer-profile.repository";
import { createInfluencerProfileService } from "./influencer-profile.service";

export async function createServerInfluencerProfileService() {
  return createInfluencerProfileService({
    repository: createDrizzleInfluencerProfileRepository(),
    runVerifiedTransaction:
      await createServerVerifiedAccountTransactionRunner(),
  });
}

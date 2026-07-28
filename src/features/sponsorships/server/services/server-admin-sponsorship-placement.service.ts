import "server-only";

import { createServerVerifiedAccountTransactionRunner } from "@/features/identity/server";

import { drizzleSponsorshipPlacementRepository } from "../repositories/drizzle-sponsorship-placement.repository";
import { createAdminSponsorshipPlacementService } from "./admin-sponsorship-placement.service";

export async function createServerAdminSponsorshipPlacementService() {
  return createAdminSponsorshipPlacementService({
    repository: drizzleSponsorshipPlacementRepository,
    runVerifiedTransaction:
      await createServerVerifiedAccountTransactionRunner(),
  });
}

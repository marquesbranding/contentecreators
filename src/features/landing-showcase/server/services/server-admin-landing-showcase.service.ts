import "server-only";

import { createServerVerifiedAccountTransactionRunner } from "@/features/identity/server";

import { drizzleLandingShowcaseRepository } from "../repositories/drizzle-landing-showcase.repository";
import { createAdminLandingShowcaseService } from "./admin-landing-showcase.service";

export async function createServerAdminLandingShowcaseService() {
  return createAdminLandingShowcaseService({
    repository: drizzleLandingShowcaseRepository,
    runVerifiedTransaction:
      await createServerVerifiedAccountTransactionRunner(),
  });
}

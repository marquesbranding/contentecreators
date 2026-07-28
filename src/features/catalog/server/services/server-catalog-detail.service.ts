import "server-only";

import { createServerVerifiedAccountTransactionRunner } from "@/features/identity/server";

import { findEligibleCatalogCreator } from "../repositories/drizzle-catalog-detail.repository";
import { createCatalogDetailService } from "./catalog-detail.service";

export async function createServerCatalogDetailService() {
  return createCatalogDetailService({
    findEligibleCreator: findEligibleCatalogCreator,
    runVerifiedAccountTransaction:
      await createServerVerifiedAccountTransactionRunner(),
  });
}

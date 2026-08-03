import "server-only";

import { createServerVerifiedAccountTransactionRunner } from "@/features/identity/server";

import { findEligibleCompanyDetail } from "../repositories/drizzle-company-detail.repository";
import { createCompanyDetailService } from "./company-detail.service";

export async function createServerCompanyDetailService() {
  return createCompanyDetailService({
    findEligibleCompany: findEligibleCompanyDetail,
    runVerifiedAccountTransaction:
      await createServerVerifiedAccountTransactionRunner(),
  });
}

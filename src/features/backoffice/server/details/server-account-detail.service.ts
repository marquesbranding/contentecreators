import "server-only";

import { createServerVerifiedAccountTransactionRunner } from "@/features/identity/server";

import { createAccountDetailService } from "./account-detail.service";
import { createDrizzleAccountDetailRepository } from "./drizzle-account-detail.repository";

export async function createServerAccountDetailService() {
  return createAccountDetailService({
    repository: createDrizzleAccountDetailRepository({
      runVerifiedTransaction:
        await createServerVerifiedAccountTransactionRunner(),
    }),
  });
}

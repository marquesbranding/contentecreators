import "server-only";

import {
  AccountAccessError,
  type CurrentAccountDto,
} from "@/features/identity/server";

import type { CatalogViewer } from "../../types/creator-catalog.types";

interface CatalogViewerCandidate {
  accountId: string;
  archivedAt: string | null;
  role: CurrentAccountDto["role"] | null;
  status: CurrentAccountDto["status"];
}

export function authorizeCatalogViewer(
  account: CatalogViewerCandidate,
): CatalogViewer {
  if (account.archivedAt) {
    throw new AccountAccessError("ACCOUNT_REQUIRED");
  }

  if (account.role !== "COMPANY" && account.role !== "INFLUENCER") {
    throw new AccountAccessError("ROLE_FORBIDDEN");
  }

  if (account.status !== "APPROVED") {
    throw new AccountAccessError("STATUS_FORBIDDEN");
  }

  return {
    accountId: account.accountId,
    role: account.role,
  };
}

import "server-only";

import type { ApplicationTransaction } from "@/db/client";

import type {
  LandingShowcaseCommand,
  LandingShowcaseManagementResponseDto,
} from "../../api/landing-showcase-management.contract";

export type LandingShowcaseRepositoryErrorCode =
  "NOT_ENABLED" | "NOT_FOUND" | "VERSION_CONFLICT";

export class LandingShowcaseRepositoryError extends Error {
  constructor(readonly code: LandingShowcaseRepositoryErrorCode) {
    super(code);
    this.name = "LandingShowcaseRepositoryError";
  }
}

export interface LandingShowcaseRepository {
  applyCommand(
    transaction: ApplicationTransaction,
    command: LandingShowcaseCommand,
  ): Promise<void>;
  listCandidates(
    transaction: ApplicationTransaction,
  ): Promise<LandingShowcaseManagementResponseDto>;
}

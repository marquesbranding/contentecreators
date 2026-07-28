import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import type { ApplicationTransaction } from "@/db/client";
import { accounts } from "@/db/schema";

import type {
  AdminProfileTarget,
  AdminProfileTargetRepository,
} from "../services/admin-profile-edit.service";

export function createDrizzleAdminProfileTargetRepository(): AdminProfileTargetRepository {
  return {
    async loadTarget(
      transaction: ApplicationTransaction,
      accountId: string,
    ): Promise<AdminProfileTarget | null> {
      const [target] = await transaction
        .select({
          role: accounts.role,
          status: accounts.status,
        })
        .from(accounts)
        .where(and(eq(accounts.id, accountId), isNull(accounts.archivedAt)))
        .limit(1);

      if (
        !target ||
        (target.role !== "COMPANY" && target.role !== "INFLUENCER")
      ) {
        return null;
      }

      return {
        role: target.role,
        status: target.status,
      };
    },
  };
}

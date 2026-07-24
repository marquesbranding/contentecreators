import "server-only";

import { and, eq } from "drizzle-orm";

import type { ApplicationTransaction } from "@/db/client";
import { onboardingDrafts } from "@/db/schema";

import { onboardingDraftSaveSchema } from "../../schemas/onboarding-draft-schema";
import type {
  OnboardingDraftDto,
  OnboardingDraftRepository,
} from "../services/onboarding-draft.service";

function toDraftDto(
  row: typeof onboardingDrafts.$inferSelect,
): OnboardingDraftDto {
  const parsed = onboardingDraftSaveSchema.safeParse({
    expectedVersion: row.version,
    payload: row.payload,
    role: row.role,
  });

  if (!parsed.success) {
    throw new Error("Persisted onboarding draft is invalid.");
  }

  return {
    payload: parsed.data.payload,
    role: parsed.data.role,
    updatedAt: row.updatedAt,
    version: row.version,
  };
}
async function readOwnerDraft(
  transaction: ApplicationTransaction,
  accountId: string,
) {
  const [row] = await transaction
    .select()
    .from(onboardingDrafts)
    .where(eq(onboardingDrafts.accountId, accountId))
    .limit(1);

  return row ?? null;
}

export function createDrizzleOnboardingDraftRepository(): OnboardingDraftRepository {
  return {
    async loadOwnerDraft(transaction, accountId) {
      const row = await readOwnerDraft(transaction, accountId);
      return row ? toDraftDto(row) : null;
    },

    async saveOwnerDraft(transaction, input) {
      const [savedRow] =
        input.expectedVersion === 0
          ? await transaction
              .insert(onboardingDrafts)
              .values({
                accountId: input.accountId,
                payload: input.payload,
                role: input.role,
              })
              .onConflictDoNothing({ target: onboardingDrafts.accountId })
              .returning()
          : await transaction
              .update(onboardingDrafts)
              .set({ payload: input.payload })
              .where(
                and(
                  eq(onboardingDrafts.accountId, input.accountId),
                  eq(onboardingDrafts.role, input.role),
                  eq(onboardingDrafts.version, input.expectedVersion),
                ),
              )
              .returning();

      if (savedRow) {
        return {
          draft: toDraftDto(savedRow),
          kind: "saved",
        };
      }

      const current = await readOwnerDraft(transaction, input.accountId);

      return {
        currentVersion: current?.version ?? 0,
        kind: "conflict",
      };
    },
  };
}

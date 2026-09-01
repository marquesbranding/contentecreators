import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { creatorProfiles, whatsappContactConfirmations } from "@/db/schema";
import { applyVerifiedAuditContext } from "@/features/audit/server";
import {
  createServerVerifiedAccountTransactionRunner,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import type {
  ConfirmWhatsappContactResult,
  PendingWhatsappContactDto,
} from "../../types/whatsapp-contact.types";

interface RecordClickFunctionRow extends Record<string, unknown> {
  confirmation_id: string;
}

interface ConfirmFunctionRow extends Record<string, unknown> {
  creator_profile_id: string;
  whatsapp_contact_count: number;
}

export interface WhatsappContactRepository {
  confirm(input: {
    confirmationId: string;
    requestId: string;
  }): Promise<ConfirmWhatsappContactResult>;
  listPending(input: {
    requestId: string;
  }): Promise<PendingWhatsappContactDto[]>;
  recordClick(input: {
    creatorProfileId: string;
    requestId: string;
  }): Promise<{ confirmationId: string }>;
}

interface DrizzleWhatsappContactDependencies {
  runVerifiedAccountTransaction: VerifiedAccountTransactionRunner;
}

export function createDrizzleWhatsappContactRepository({
  runVerifiedAccountTransaction,
}: DrizzleWhatsappContactDependencies): WhatsappContactRepository {
  return {
    async recordClick({ creatorProfileId, requestId }) {
      return runVerifiedAccountTransaction(
        { preferredRole: "NON_ADMIN", requestId },
        async (transaction, actor) => {
          await applyVerifiedAuditContext(transaction, {
            actorAccountId: actor.accountId,
            actorRole: actor.role,
            actorType: "USER",
            reason: "Recorded a WhatsApp contact click on a creator profile",
            requestId,
            source: "APPLICATION",
          });

          const [row] = await transaction.execute<RecordClickFunctionRow>(sql`
            select
              public.app_record_whatsapp_contact_click(${creatorProfileId}::uuid)
                as confirmation_id
          `);

          if (!row) {
            throw new Error(
              "WhatsApp contact click did not return a confirmation id.",
            );
          }

          return { confirmationId: row.confirmation_id };
        },
      );
    },

    async confirm({ confirmationId, requestId }) {
      return runVerifiedAccountTransaction(
        { preferredRole: "NON_ADMIN", requestId },
        async (transaction, actor) => {
          await applyVerifiedAuditContext(transaction, {
            actorAccountId: actor.accountId,
            actorRole: actor.role,
            actorType: "USER",
            reason: "Confirmed a WhatsApp contact with a creator",
            requestId,
            source: "APPLICATION",
          });

          const [row] = await transaction.execute<ConfirmFunctionRow>(sql`
            select creator_profile_id, whatsapp_contact_count
            from public.app_confirm_whatsapp_contact(${confirmationId}::uuid)
          `);

          if (!row) {
            throw new Error(
              "WhatsApp contact confirmation did not return a result.",
            );
          }

          return {
            creatorProfileId: row.creator_profile_id,
            whatsappContactCount: row.whatsapp_contact_count,
          };
        },
      );
    },

    async listPending({ requestId }) {
      return runVerifiedAccountTransaction(
        { preferredRole: "NON_ADMIN", requestId },
        async (transaction, actor) => {
          if (actor.role !== "COMPANY") {
            return [];
          }

          const rows = await transaction
            .select({
              clickedAt: whatsappContactConfirmations.clickedAt,
              confirmationId: whatsappContactConfirmations.id,
              creatorDisplayName: creatorProfiles.displayName,
              creatorProfileId: whatsappContactConfirmations.creatorProfileId,
            })
            .from(whatsappContactConfirmations)
            .innerJoin(
              creatorProfiles,
              eq(
                creatorProfiles.id,
                whatsappContactConfirmations.creatorProfileId,
              ),
            )
            .where(
              and(
                eq(
                  whatsappContactConfirmations.companyAccountId,
                  actor.accountId,
                ),
                eq(whatsappContactConfirmations.status, "PENDING"),
              ),
            )
            .orderBy(asc(whatsappContactConfirmations.clickedAt));

          return rows.map((row) => ({
            clickedAt: row.clickedAt.toISOString(),
            confirmationId: row.confirmationId,
            creatorDisplayName: row.creatorDisplayName,
            creatorProfileId: row.creatorProfileId,
          }));
        },
      );
    },
  };
}

export async function createServerWhatsappContactRepository() {
  return createDrizzleWhatsappContactRepository({
    runVerifiedAccountTransaction:
      await createServerVerifiedAccountTransactionRunner(),
  });
}

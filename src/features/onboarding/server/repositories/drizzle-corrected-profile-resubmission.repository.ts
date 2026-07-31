import "server-only";

import { and, desc, eq, isNull, lte, sql } from "drizzle-orm";

import type { ApplicationTransaction } from "@/db/client";
import {
  accountConsents,
  accountContactPreferences,
  accounts,
  legalDocuments,
  moderationCases,
  moderationEvents,
} from "@/db/schema";

import type { CompanyProfileEditInput } from "../../schemas/company-profile-edit-schema";
import type { GoogleProfileInput } from "../../schemas/onboarding-form-schema";
import type { InfluencerProfileEditInput } from "../../schemas/influencer-profile-edit-schema";
import { createDrizzleCompanyProfileRepository } from "./drizzle-company-profile.repository";
import { createDrizzleInfluencerProfileRepository } from "./drizzle-influencer-profile.repository";
import type {
  CorrectedProfileResubmissionPersistenceResult,
  CorrectedProfileResubmissionRepository,
} from "../services/corrected-profile-resubmission.service";

interface ResubmissionFunctionRow extends Record<string, unknown> {
  outbox_id: string | null;
  result_kind: "ALREADY_APPLIED" | "APPLIED";
}

function creatorEditInput(
  profile: Extract<GoogleProfileInput, { role: "INFLUENCER" }>,
  expectedVersion: number,
): InfluencerProfileEditInput {
  return {
    bio: profile.bio,
    city: profile.city,
    creatorType: profile.creatorType,
    displayName: profile.displayName,
    engagementRate: profile.engagementRate,
    expectedVersion,
    followers: profile.followers,
    legalName: profile.legalName,
    nicheSlugs: profile.nicheSlugs,
    otherNiche: profile.otherNiche,
    socialPlatform: profile.socialPlatform,
    socialUrl: profile.socialUrl,
    state: profile.state,
    whatsapp: profile.whatsapp,
  };
}

function companyEditInput(
  profile: Extract<GoogleProfileInput, { role: "COMPANY" }>,
  expectedVersion: number,
): CompanyProfileEditInput {
  return {
    additionalLocations: profile.additionalLocations,
    city: profile.city,
    cnpj: profile.cnpj,
    complement: profile.complement,
    description: profile.description,
    employeeRange: profile.employeeRange,
    expectedVersion,
    legalName: profile.legalName,
    neighborhood: profile.neighborhood,
    number: profile.number,
    postalCode: profile.postalCode,
    segment: profile.segment,
    socialPlatform: profile.socialPlatform,
    socialUrl: profile.socialUrl,
    state: profile.state,
    street: profile.street,
    tradeName: profile.tradeName,
    websiteUrl: profile.websiteUrl,
    whatsapp: profile.whatsapp,
  };
}

async function persistCurrentConsents(
  transaction: ApplicationTransaction,
  accountId: string,
  profile: GoogleProfileInput,
  requestId: string,
) {
  const now = new Date();
  const documents = await transaction
    .select()
    .from(legalDocuments)
    .where(
      and(
        isNull(legalDocuments.retiredAt),
        lte(legalDocuments.activeFrom, now),
      ),
    )
    .orderBy(desc(legalDocuments.activeFrom), desc(legalDocuments.publishedAt));
  const requiredDocuments = documents.filter(
    (document) =>
      document.documentType === "TERMS" || document.documentType === "PRIVACY",
  );

  if (
    !requiredDocuments.some((document) => document.documentType === "TERMS") ||
    !requiredDocuments.some((document) => document.documentType === "PRIVACY")
  ) {
    throw new Error("Active legal documents are not configured.");
  }

  await transaction
    .insert(accountConsents)
    .values(
      requiredDocuments.map((document) => ({
        accountId,
        context: { flow: "correction-resubmission", legalCopyApproved: false },
        legalDocumentId: document.id,
        requestId,
      })),
    )
    .onConflictDoNothing();

  if (profile.role !== "INFLUENCER") {
    return;
  }

  const contactDocument = documents.find(
    (document) => document.documentType === "CONTACT_VISIBILITY",
  );
  if (!contactDocument) {
    throw new Error("Active contact visibility document is not configured.");
  }

  await transaction
    .update(accountContactPreferences)
    .set({
      consentDocumentId: contactDocument.id,
      emailVisibleToApprovedCompanies: profile.contactVisibilityAccepted,
      socialVisibleToApprovedCompanies: profile.contactVisibilityAccepted,
      whatsappVisibleToApprovedCompanies: profile.contactVisibilityAccepted,
    })
    .where(
      and(
        eq(accountContactPreferences.accountId, accountId),
        isNull(accountContactPreferences.archivedAt),
      ),
    );

  if (profile.contactVisibilityAccepted) {
    await transaction
      .insert(accountConsents)
      .values({
        accountId,
        context: {
          emailVisibleToApprovedCompanies: true,
          flow: "correction-resubmission",
          legalCopyApproved: false,
          socialVisibleToApprovedCompanies: true,
          whatsappVisibleToApprovedCompanies: true,
        },
        legalDocumentId: contactDocument.id,
        requestId,
      })
      .onConflictDoNothing();
  }
}

export function createDrizzleCorrectedProfileResubmissionRepository(): CorrectedProfileResubmissionRepository {
  const influencerProfiles = createDrizzleInfluencerProfileRepository();
  const companyProfiles = createDrizzleCompanyProfileRepository();

  return {
    async resubmit(transaction, context, input) {
      const [existingEvent] = await transaction
        .select({ id: moderationEvents.id })
        .from(moderationEvents)
        .innerJoin(
          moderationCases,
          eq(moderationCases.id, moderationEvents.moderationCaseId),
        )
        .where(
          and(
            eq(moderationEvents.idempotencyKey, input.command.idempotencyKey),
            eq(moderationEvents.action, "RESUBMIT"),
            eq(moderationCases.accountId, context.accountId),
          ),
        )
        .limit(1);

      if (existingEvent) {
        return { kind: "already_submitted" };
      }

      if (context.status !== "CHANGES_REQUESTED") {
        throw new Error("Account cannot start a new correction resubmission.");
      }

      const [account] = await transaction
        .select({ version: accounts.version })
        .from(accounts)
        .where(eq(accounts.id, context.accountId))
        .limit(1);

      if (account?.version !== input.command.expectedAccountVersion) {
        return {
          code: "ACCOUNT_STALE",
          kind: "conflict",
        };
      }

      const profileResult =
        input.profile.role === "INFLUENCER"
          ? await influencerProfiles.updateApprovedProfile(
              transaction,
              context.accountId,
              creatorEditInput(
                input.profile,
                input.command.expectedProfileVersion,
              ),
              input.requestId,
              "Resubmit corrected influencer profile",
            )
          : await companyProfiles.updateApprovedProfile(
              transaction,
              context.accountId,
              companyEditInput(
                input.profile,
                input.command.expectedProfileVersion,
              ),
              input.requestId,
              "Resubmit corrected company profile",
            );

      if (profileResult.kind === "conflict") {
        return {
          code: "PROFILE_STALE",
          kind: "conflict",
        };
      }

      await persistCurrentConsents(
        transaction,
        context.accountId,
        input.profile,
        input.requestId,
      );

      const [transition] =
        await transaction.execute<ResubmissionFunctionRow>(sql`
          select result_kind, outbox_id
          from public.app_resubmit_moderation_with_outbox(
            ${context.accountId}::uuid,
            ${input.command.expectedAccountVersion},
            ${input.command.expectedProfileVersion},
            ${input.command.idempotencyKey}
          )
        `);

      if (!transition) {
        throw new Error("Correction resubmission returned no result.");
      }

      if (transition.result_kind === "ALREADY_APPLIED") {
        return {
          kind: "already_submitted",
        } satisfies CorrectedProfileResubmissionPersistenceResult;
      }

      if (!transition.outbox_id) {
        throw new Error(
          "Correction resubmission email outbox item was not created.",
        );
      }

      return {
        kind: "submitted",
        outboxId: transition.outbox_id,
      } satisfies CorrectedProfileResubmissionPersistenceResult;
    },
  };
}

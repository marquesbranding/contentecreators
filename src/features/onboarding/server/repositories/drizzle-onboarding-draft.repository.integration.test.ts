import postgres from "postgres";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createDatabaseClient } from "@/db/client";
import { createVerifiedAccountTransactionRunner } from "@/features/identity/server";

import { createDrizzleOnboardingDraftRepository } from "./drizzle-onboarding-draft.repository";
import { createOnboardingDraftService } from "../services/onboarding-draft.service";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const sqlClient = postgres(databaseUrl, {
  connect_timeout: 5,
  idle_timeout: 1,
  max: 1,
  prepare: false,
});
const drizzleClient = createDatabaseClient(databaseUrl);
const creatorAuthUserId = "20000000-0000-4000-8000-000000000001";
const creatorAccountId = "b0000000-0000-4000-8000-000000000001";
const companyAuthUserId = "30000000-0000-4000-8000-000000000001";
const companyAccountId = "c0000000-0000-4000-8000-000000000001";

function createService(authUserId: string) {
  return createOnboardingDraftService({
    repository: createDrizzleOnboardingDraftRepository(),
    runOwnerTransaction: createVerifiedAccountTransactionRunner({
      database: drizzleClient.database,
      resolveVerifiedAuthUserId: vi.fn().mockResolvedValue(authUserId),
    }),
  });
}

describeLocalStack("Drizzle onboarding draft repository", () => {
  beforeEach(async () => {
    await sqlClient`
      delete from public.onboarding_drafts
      where account_id in (${creatorAccountId}, ${companyAccountId})
    `;
  });

  afterAll(async () => {
    await sqlClient`
      delete from public.onboarding_drafts
      where account_id in (${creatorAccountId}, ${companyAccountId})
    `;
    await sqlClient.end({ timeout: 2 });
    await drizzleClient.client.end({ timeout: 2 });
  });

  it("creates, restores, and updates only the current owner's draft", async () => {
    const creatorService = createService(creatorAuthUserId);
    const companyService = createService(companyAuthUserId);

    await expect(
      creatorService.saveOwnerDraft({
        expectedVersion: 0,
        payload: {
          creatorType: "UGC",
          displayName: "Ana em progresso",
          nicheSlugs: ["tecnologia"],
        },
        requestId: "draft-create",
        role: "INFLUENCER",
      }),
    ).resolves.toMatchObject({
      draft: {
        payload: {
          creatorType: "UGC",
          displayName: "Ana em progresso",
          nicheSlugs: ["tecnologia"],
        },
        role: "INFLUENCER",
        version: 1,
      },
      kind: "saved",
    });

    await expect(
      creatorService.loadOwnerDraft({ requestId: "draft-load-creator" }),
    ).resolves.toMatchObject({
      payload: {
        creatorType: "UGC",
        displayName: "Ana em progresso",
        nicheSlugs: ["tecnologia"],
      },
      role: "INFLUENCER",
      version: 1,
    });
    await expect(
      companyService.loadOwnerDraft({ requestId: "draft-load-company" }),
    ).resolves.toBeNull();

    await expect(
      creatorService.saveOwnerDraft({
        expectedVersion: 1,
        payload: {
          creatorType: "UGC",
          displayName: "Ana atualizada",
          nicheSlugs: ["tecnologia"],
        },
        requestId: "draft-update",
        role: "INFLUENCER",
      }),
    ).resolves.toMatchObject({
      draft: {
        payload: expect.objectContaining({ displayName: "Ana atualizada" }),
        version: 2,
      },
      kind: "saved",
    });
  });

  it("does not overwrite a newer version when another tab saves first", async () => {
    const creatorService = createService(creatorAuthUserId);
    await creatorService.saveOwnerDraft({
      expectedVersion: 0,
      payload: { displayName: "Primeira versão" },
      requestId: "draft-initial",
      role: "INFLUENCER",
    });
    await creatorService.saveOwnerDraft({
      expectedVersion: 1,
      payload: { displayName: "Versão da aba mais nova" },
      requestId: "draft-new-tab",
      role: "INFLUENCER",
    });

    await expect(
      creatorService.saveOwnerDraft({
        expectedVersion: 1,
        payload: { displayName: "Versão obsoleta" },
        requestId: "draft-stale-tab",
        role: "INFLUENCER",
      }),
    ).resolves.toEqual({
      currentVersion: 2,
      kind: "conflict",
      message:
        "Este cadastro foi atualizado em outra aba. Recarregue os dados antes de continuar.",
    });
    await expect(
      creatorService.loadOwnerDraft({ requestId: "draft-after-conflict" }),
    ).resolves.toMatchObject({
      payload: { displayName: "Versão da aba mais nova" },
      version: 2,
    });
  });

  it("applies the same optimistic version contract to company social drafts", async () => {
    const companyService = createService(companyAuthUserId);
    await companyService.saveOwnerDraft({
      expectedVersion: 0,
      payload: {
        socialPlatform: "LINKEDIN",
        socialUrl: "https://linkedin.com/company/primeira-versao",
      },
      requestId: "company-draft-initial",
      role: "COMPANY",
    });
    await companyService.saveOwnerDraft({
      expectedVersion: 1,
      payload: {
        socialPlatform: "LINKEDIN",
        socialUrl: "https://linkedin.com/company/versao-atual",
      },
      requestId: "company-draft-current",
      role: "COMPANY",
    });

    await expect(
      companyService.saveOwnerDraft({
        expectedVersion: 1,
        payload: {
          socialPlatform: "INSTAGRAM",
          socialUrl: "https://instagram.com/versao-obsoleta",
        },
        requestId: "company-draft-stale",
        role: "COMPANY",
      }),
    ).resolves.toMatchObject({
      currentVersion: 2,
      kind: "conflict",
    });
    await expect(
      companyService.loadOwnerDraft({
        requestId: "company-draft-after-conflict",
      }),
    ).resolves.toMatchObject({
      payload: {
        socialPlatform: "LINKEDIN",
        socialUrl: "https://linkedin.com/company/versao-atual",
      },
      version: 2,
    });
  });
});

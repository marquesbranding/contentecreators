import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import {
  accounts,
  creatorMetricSnapshots,
  creatorNiches,
  creatorProfiles,
  niches,
  socialProfiles,
} from "@/db/schema";
import type {
  VerifiedAccountContext,
  VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import { createCatalogDirectoryService } from "../services/catalog-directory.service";
import { listDirectoryPage } from "./drizzle-directory.repository";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const client = createDatabaseClient(databaseUrl);
const rollback = new Error("rollback catalog directory fixtures");

// Pre-seeded in supabase/seed.sql — reused so the test doesn't have to stand
// up a second company fixture just to prove the mix works.
const approvedCompany: VerifiedAccountContext = {
  accountId: "c0000000-0000-4000-8000-000000000004",
  authUserId: "30000000-0000-4000-8000-000000000004",
  role: "COMPANY",
  status: "APPROVED",
};
const approvedCreatorViewer: VerifiedAccountContext = {
  accountId: "b0000000-0000-4000-8000-000000000004",
  authUserId: "20000000-0000-4000-8000-000000000004",
  role: "INFLUENCER",
  status: "APPROVED",
};
const fixtureAuthUserId = "29000000-0000-4000-8000-000000000019";
const fixtureAccountId = "b9000000-0000-4000-8000-000000000019";
const fixtureCreatorId = "d9000000-0000-4000-8000-000000000019";

function createRunner(
  transaction: Parameters<
    Parameters<
      ReturnType<typeof createDatabaseClient>["database"]["transaction"]
    >[0]
  >[0],
  context: VerifiedAccountContext,
): VerifiedAccountTransactionRunner {
  return async ({ requestId }, work) => {
    await transaction.execute(sql`
      select
        set_config('app.jwt.auth_user_id', ${context.authUserId}, true),
        set_config('app.jwt.account_id', ${context.accountId}, true),
        set_config('app.jwt.account_role', ${context.role}, true),
        set_config('app.jwt.account_status', ${context.status}, true),
        set_config('app.jwt.request_id', ${requestId}, true)
    `);
    await transaction.execute(sql.raw("set local role contente_app_user"));

    return work(transaction, context);
  };
}

describeLocalStack("Drizzle catalog directory repository", () => {
  it("mixes creators and companies, filters by type, self-excludes and paginates by cursor", async () => {
    let proof:
      | {
          companyOnly: Awaited<
            ReturnType<ReturnType<typeof createCatalogDirectoryService>["list"]>
          >;
          creatorOnly: Awaited<
            ReturnType<ReturnType<typeof createCatalogDirectoryService>["list"]>
          >;
          firstPage: Awaited<
            ReturnType<ReturnType<typeof createCatalogDirectoryService>["list"]>
          >;
          mixed: Awaited<
            ReturnType<ReturnType<typeof createCatalogDirectoryService>["list"]>
          >;
          secondPage: Awaited<
            ReturnType<ReturnType<typeof createCatalogDirectoryService>["list"]>
          >;
          selfExcluded: Awaited<
            ReturnType<ReturnType<typeof createCatalogDirectoryService>["list"]>
          >;
        }
      | undefined;

    try {
      await client.database.transaction(async (transaction) => {
        await transaction.execute(sql`
          insert into auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at, confirmation_token, recovery_token,
            email_change_token_new, email_change
          )
          values (
            '00000000-0000-4000-8000-000000000000',
            ${fixtureAuthUserId},
            'authenticated', 'authenticated',
            'directory-fixture@contentecreators.test',
            extensions.crypt('LocalTest123!', extensions.gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"fixture":true}'::jsonb,
            now(), now(), '', '', '', ''
          )
        `);
        await transaction.insert(accounts).values({
          approvedAt: new Date(),
          authUserId: fixtureAuthUserId,
          completionPercentage: 69,
          id: fixtureAccountId,
          operationalEmail: "directory-fixture@contentecreators.test",
          role: "INFLUENCER",
          status: "APPROVED",
          submittedAt: new Date(),
        });
        await transaction.insert(creatorProfiles).values({
          accountId: fixtureAccountId,
          bio: "Perfil sintético para o diretório unificado.",
          city: "São Paulo",
          creatorType: "UGC",
          displayName: "Diretório Criadora",
          id: fixtureCreatorId,
          legalName: "Diretório Criadora Exemplo",
          state: "SP",
          whatsappE164: "+5511999999919",
        });
        const [beautyNiche] = await transaction
          .select({ id: niches.id })
          .from(niches)
          .where(eq(niches.slug, "beleza"));

        if (!beautyNiche) {
          throw new Error("Expected the seeded beauty niche.");
        }

        await transaction.insert(creatorNiches).values({
          creatorProfileId: fixtureCreatorId,
          nicheId: beautyNiche.id,
        });
        await transaction.insert(socialProfiles).values({
          id: "f9000000-0000-4000-8000-000000000019",
          normalizedUrl: "https://tiktok.com/@diretorio-catalogo",
          ownerAccountId: fixtureAccountId,
          platform: "TIKTOK",
        });
        await transaction.insert(creatorMetricSnapshots).values({
          creatorProfileId: fixtureCreatorId,
          followerCount: 12_000,
          id: "e9000000-0000-4000-8000-000000000019",
          observedOn: new Date("2026-07-20T00:00:00.000Z"),
          platform: "TIKTOK",
          socialProfileId: "f9000000-0000-4000-8000-000000000019",
        });

        const viewerService = createCatalogDirectoryService({
          list: listDirectoryPage,
          runVerifiedAccountTransaction: createRunner(
            transaction,
            approvedCreatorViewer,
          ),
        });

        const mixed = await viewerService.list(
          { search: "diretório" },
          `directory-mixed-${crypto.randomUUID()}`,
        );
        const creatorOnly = await viewerService.list(
          { search: "diretório", type: ["INFLUENCER", "UGC"] },
          `directory-creator-only-${crypto.randomUUID()}`,
        );
        const companyOnly = await viewerService.list(
          { search: "diretório", type: ["COMPANY"] },
          `directory-company-only-${crypto.randomUUID()}`,
        );
        const firstPage = await viewerService.list(
          { pageSize: 1 },
          `directory-first-${crypto.randomUUID()}`,
        );

        if (!firstPage.nextCursor) {
          throw new Error("Expected another bounded directory page.");
        }

        const secondPage = await viewerService.list(
          { cursor: firstPage.nextCursor, pageSize: 1 },
          `directory-second-${crypto.randomUUID()}`,
        );

        const companyViewerService = createCatalogDirectoryService({
          list: listDirectoryPage,
          runVerifiedAccountTransaction: createRunner(
            transaction,
            approvedCompany,
          ),
        });
        const selfExcluded = await companyViewerService.list(
          { search: "Empresa Quatro" },
          `directory-self-${crypto.randomUUID()}`,
        );

        proof = {
          companyOnly,
          creatorOnly,
          firstPage,
          mixed,
          secondPage,
          selfExcluded,
        };
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) {
        throw error;
      }
    }

    expect(proof).toBeDefined();
    expect(proof?.mixed.items).toEqual([
      expect.objectContaining({
        creatorId: fixtureCreatorId,
        displayName: "Diretório Criadora",
        kind: "CREATOR",
      }),
    ]);
    expect(proof?.creatorOnly.items).toEqual(proof?.mixed.items);
    expect(proof?.companyOnly.items).toEqual([]);
    expect(proof?.firstPage.items).toHaveLength(1);
    expect(proof?.secondPage.items).toHaveLength(1);
    expect(proof?.secondPage.items[0]).not.toEqual(proof?.firstPage.items[0]);
    expect(proof?.selfExcluded.items).toEqual([]);
    expect(proof?.mixed.facets.niches).toEqual(
      expect.arrayContaining([{ name: "Beleza", slug: "beleza" }]),
    );
    expect(JSON.stringify(proof)).not.toMatch(
      /"(?:accountId|authUserId|operationalEmail|whatsapp|moderation|audit|archivedAt|legalName|cnpj|objectPath|bucketName)"\s*:/i,
    );
  });
});

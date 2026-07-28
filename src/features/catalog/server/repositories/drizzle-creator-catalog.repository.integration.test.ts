import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import {
  accounts,
  creatorNiches,
  creatorProfiles,
  niches,
  socialProfiles,
} from "@/db/schema";
import type {
  VerifiedAccountContext,
  VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import { createCreatorCatalogService } from "../services/creator-catalog.service";
import { listCreatorCatalog } from "./drizzle-creator-catalog.repository";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const client = createDatabaseClient(databaseUrl);
const rollback = new Error("rollback creator catalog fixtures");

const approvedCompany: VerifiedAccountContext = {
  accountId: "c0000000-0000-4000-8000-000000000004",
  authUserId: "30000000-0000-4000-8000-000000000004",
  role: "COMPANY",
  status: "APPROVED",
};
const approvedCreator: VerifiedAccountContext = {
  accountId: "b0000000-0000-4000-8000-000000000004",
  authUserId: "20000000-0000-4000-8000-000000000004",
  role: "INFLUENCER",
  status: "APPROVED",
};
const fixtureAuthUserId = "29000000-0000-4000-8000-000000000018";
const fixtureAccountId = "b9000000-0000-4000-8000-000000000018";
const fixtureCreatorId = "d9000000-0000-4000-8000-000000000018";

describeLocalStack("Drizzle creator catalog repository", () => {
  afterAll(async () => {
    await client.client.end({ timeout: 2 });
  });

  it("composes normalized filters, excludes self and paginates minimal approved cards", async () => {
    let proof:
      | {
          combinedResult: Awaited<
            ReturnType<ReturnType<typeof createCreatorCatalogService>["list"]>
          >;
          firstPage: Awaited<
            ReturnType<ReturnType<typeof createCreatorCatalogService>["list"]>
          >;
          secondPage: Awaited<
            ReturnType<ReturnType<typeof createCreatorCatalogService>["list"]>
          >;
          selfResult: Awaited<
            ReturnType<ReturnType<typeof createCreatorCatalogService>["list"]>
          >;
        }
      | undefined;

    try {
      await client.database.transaction(async (transaction) => {
        await transaction.execute(sql`
          insert into auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            email_change
          )
          values (
            '00000000-0000-4000-8000-000000000000',
            ${fixtureAuthUserId},
            'authenticated',
            'authenticated',
            'creator-catalog-fixture@contentecreators.test',
            extensions.crypt('LocalTest123!', extensions.gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"fixture":true}'::jsonb,
            now(),
            now(),
            '',
            '',
            '',
            ''
          )
        `);
        await transaction.insert(accounts).values({
          approvedAt: new Date(),
          authUserId: fixtureAuthUserId,
          completionPercentage: 100,
          id: fixtureAccountId,
          operationalEmail: "creator-catalog-fixture@contentecreators.test",
          role: "INFLUENCER",
          status: "APPROVED",
          submittedAt: new Date(),
        });
        await transaction.insert(creatorProfiles).values({
          accountId: fixtureAccountId,
          bio: "Perfil sintético de Júlia para busca e filtros do catálogo.",
          city: "São Paulo",
          creatorType: "UGC",
          displayName: "Júlia Criadora",
          id: fixtureCreatorId,
          legalName: "Júlia Criadora Exemplo",
          state: "SP",
          whatsappE164: "+5511999999918",
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
          id: "f9000000-0000-4000-8000-000000000018",
          normalizedUrl: "https://tiktok.com/@julia-catalogo",
          ownerAccountId: fixtureAccountId,
          platform: "TIKTOK",
        });

        const createRunner = (
          context: VerifiedAccountContext,
        ): VerifiedAccountTransactionRunner => {
          return async ({ requestId }, work) => {
            await transaction.execute(sql`
              select
                set_config('app.jwt.auth_user_id', ${context.authUserId}, true),
                set_config('app.jwt.account_id', ${context.accountId}, true),
                set_config('app.jwt.account_role', ${context.role}, true),
                set_config('app.jwt.account_status', ${context.status}, true),
                set_config('app.jwt.request_id', ${requestId}, true)
            `);
            await transaction.execute(
              sql.raw("set local role contente_app_user"),
            );

            return work(transaction, context);
          };
        };
        const companyService = createCreatorCatalogService({
          list: listCreatorCatalog,
          runVerifiedAccountTransaction: createRunner(approvedCompany),
        });
        const combinedResult = await companyService.list(
          {
            city: "sao paulo",
            creatorType: "UGC",
            niche: "beleza",
            platform: "TIKTOK",
            search: "JULIA",
            state: "sp",
          },
          `creator-catalog-combined-${crypto.randomUUID()}`,
        );
        const firstPage = await companyService.list(
          { pageSize: 1 },
          `creator-catalog-first-${crypto.randomUUID()}`,
        );

        if (!firstPage.nextCursor) {
          throw new Error("Expected another bounded catalog page.");
        }

        const secondPage = await companyService.list(
          { cursor: firstPage.nextCursor, pageSize: 1 },
          `creator-catalog-second-${crypto.randomUUID()}`,
        );
        const influencerService = createCreatorCatalogService({
          list: listCreatorCatalog,
          runVerifiedAccountTransaction: createRunner(approvedCreator),
        });
        const selfResult = await influencerService.list(
          { search: "Diego Aprova" },
          `creator-catalog-self-${crypto.randomUUID()}`,
        );

        proof = { combinedResult, firstPage, secondPage, selfResult };
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) {
        throw error;
      }
    }

    expect(proof).toBeDefined();
    expect(proof?.combinedResult.items).toEqual([
      {
        bioExcerpt:
          "Perfil sintético de Júlia para busca e filtros do catálogo.",
        city: "São Paulo",
        creatorId: fixtureCreatorId,
        creatorType: "UGC",
        displayName: "Júlia Criadora",
        niches: [{ name: "Beleza", slug: "beleza" }],
        socialPlatforms: ["TIKTOK"],
        state: "SP",
      },
    ]);
    expect(proof?.firstPage.items).toHaveLength(1);
    expect(proof?.secondPage.items).toHaveLength(1);
    expect(proof?.secondPage.items[0]?.creatorId).not.toBe(
      proof?.firstPage.items[0]?.creatorId,
    );
    expect(proof?.selfResult.items).toEqual([]);
    expect(JSON.stringify(proof)).not.toMatch(
      /accountId|authUserId|operationalEmail|whatsapp|moderation|audit|archivedAt|legalName|objectPath|bucketName/i,
    );
  });
});

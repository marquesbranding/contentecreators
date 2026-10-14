import { createHash } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import {
  accounts,
  companyProfiles,
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
import { decodeDirectoryCursor } from "./catalog-directory-cursor";
import { directoryShuffleSeedForDay } from "./catalog-directory-shuffle";
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
  it("mixes creators and companies, filters by type, marks the viewer's own profile and paginates by cursor", async () => {
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
          ownProfileListed: Awaited<
            ReturnType<ReturnType<typeof createCatalogDirectoryService>["list"]>
          >;
          secondPage: Awaited<
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
        const ownProfileListed = await companyViewerService.list(
          { search: "Empresa Quatro" },
          `directory-self-${crypto.randomUUID()}`,
        );

        proof = {
          companyOnly,
          creatorOnly,
          firstPage,
          mixed,
          ownProfileListed,
          secondPage,
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
    expect(proof?.ownProfileListed.items).toEqual([
      expect.objectContaining({
        displayName: "Empresa Quatro",
        isOwnProfile: true,
        kind: "COMPANY",
      }),
    ]);
    expect(proof?.mixed.facets.niches).toEqual(
      expect.arrayContaining([{ name: "Beleza", slug: "beleza" }]),
    );
    expect(JSON.stringify(proof)).not.toMatch(
      /"(?:accountId|authUserId|operationalEmail|whatsapp|moderation|audit|archivedAt|legalName|cnpj|objectPath|bucketName)"\s*:/i,
    );
  });
});

describeLocalStack("Drizzle catalog directory seal filters", () => {
  it("narrows creators and companies by CDL and Influencer Journey seals, combined with AND", async () => {
    const seal = {
      cdlAndJourney: {
        accountId: "b9000000-0000-4000-8000-000000000031",
        authUserId: "29000000-0000-4000-8000-000000000031",
        creatorId: "d9000000-0000-4000-8000-000000000031",
        displayName: "Selo Fixture CDL e Jornada",
        isCdlMember: true,
        isInfluencerJourneyParticipant: true,
      },
      journeyOnly: {
        accountId: "b9000000-0000-4000-8000-000000000032",
        authUserId: "29000000-0000-4000-8000-000000000032",
        creatorId: "d9000000-0000-4000-8000-000000000032",
        displayName: "Selo Fixture Somente Jornada",
        isCdlMember: false,
        isInfluencerJourneyParticipant: true,
      },
      none: {
        accountId: "b9000000-0000-4000-8000-000000000033",
        authUserId: "29000000-0000-4000-8000-000000000033",
        creatorId: "d9000000-0000-4000-8000-000000000033",
        displayName: "Selo Fixture Sem Selo",
        isCdlMember: false,
        isInfluencerJourneyParticipant: false,
      },
    } as const;

    let proof:
      | {
          both: string[];
          cdl: string[];
          companyCdl: string[];
          companyJourneyOff: string[];
          creatorsAll: string[];
          journey: string[];
        }
      | undefined;

    try {
      await client.database.transaction(async (transaction) => {
        for (const fixture of Object.values(seal)) {
          const email = `${fixture.accountId}@seal-fixture.contentecreators.test`;
          await transaction.execute(sql`
            insert into auth.users (
              instance_id, id, aud, role, email, encrypted_password,
              email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
              created_at, updated_at, confirmation_token, recovery_token,
              email_change_token_new, email_change
            )
            values (
              '00000000-0000-4000-8000-000000000000',
              ${fixture.authUserId},
              'authenticated', 'authenticated',
              ${email},
              extensions.crypt('LocalTest123!', extensions.gen_salt('bf')),
              now(),
              '{"provider":"email","providers":["email"]}'::jsonb,
              '{"fixture":true}'::jsonb,
              now(), now(), '', '', '', ''
            )
          `);
          await transaction.insert(accounts).values({
            approvedAt: new Date(),
            authUserId: fixture.authUserId,
            completionPercentage: 69,
            id: fixture.accountId,
            operationalEmail: email,
            role: "INFLUENCER",
            status: "APPROVED",
            submittedAt: new Date(),
          });
          await transaction.insert(creatorProfiles).values({
            accountId: fixture.accountId,
            bio: "Perfil sintético para validar os selos do diretório.",
            city: "Curitiba",
            creatorType: "UGC",
            displayName: fixture.displayName,
            id: fixture.creatorId,
            isCdlMember: fixture.isCdlMember,
            isInfluencerJourneyParticipant:
              fixture.isInfluencerJourneyParticipant,
            legalName: `${fixture.displayName} Exemplo`,
            state: "PR",
            whatsappE164: "+5541999999931",
          });
        }

        // The seeded approved company is the second subject: its flags are
        // flipped only inside this rolled-back transaction.
        await transaction
          .update(companyProfiles)
          .set({ isCdlMember: true, isInfluencerJourneyParticipant: false })
          .where(eq(companyProfiles.accountId, approvedCompany.accountId));

        const viewer = createCatalogDirectoryService({
          list: listDirectoryPage,
          runVerifiedAccountTransaction: createRunner(
            transaction,
            approvedCreatorViewer,
          ),
        });
        const names = (page: { items: { displayName: string }[] }) =>
          page.items.map((item) => item.displayName).sort();
        const creatorTypes = ["INFLUENCER", "UGC"] as const;

        const creatorsAll = await viewer.list(
          { search: "selo fixture", type: [...creatorTypes] },
          `seal-all-${crypto.randomUUID()}`,
        );
        const cdl = await viewer.list(
          { cdl: true, search: "selo fixture", type: [...creatorTypes] },
          `seal-cdl-${crypto.randomUUID()}`,
        );
        const journey = await viewer.list(
          { jornada: true, search: "selo fixture", type: [...creatorTypes] },
          `seal-journey-${crypto.randomUUID()}`,
        );
        const both = await viewer.list(
          {
            cdl: true,
            jornada: true,
            search: "selo fixture",
            type: [...creatorTypes],
          },
          `seal-both-${crypto.randomUUID()}`,
        );
        const companyCdl = await viewer.list(
          { cdl: true, search: "empresa quatro", type: ["COMPANY"] },
          `seal-company-cdl-${crypto.randomUUID()}`,
        );
        const companyJourneyOff = await viewer.list(
          { jornada: true, search: "empresa quatro", type: ["COMPANY"] },
          `seal-company-journey-${crypto.randomUUID()}`,
        );

        proof = {
          both: names(both),
          cdl: names(cdl),
          companyCdl: names(companyCdl),
          companyJourneyOff: names(companyJourneyOff),
          creatorsAll: names(creatorsAll),
          journey: names(journey),
        };
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) {
        throw error;
      }
    }

    expect(proof).toBeDefined();
    expect(proof?.creatorsAll).toEqual([
      "Selo Fixture CDL e Jornada",
      "Selo Fixture Sem Selo",
      "Selo Fixture Somente Jornada",
    ]);
    expect(proof?.cdl).toEqual(["Selo Fixture CDL e Jornada"]);
    expect(proof?.journey).toEqual([
      "Selo Fixture CDL e Jornada",
      "Selo Fixture Somente Jornada",
    ]);
    expect(proof?.both).toEqual(["Selo Fixture CDL e Jornada"]);
    expect(proof?.companyCdl).toEqual(["Empresa Quatro"]);
    expect(proof?.companyJourneyOff).toEqual([]);
  });
});

describeLocalStack("Drizzle catalog directory daily shuffle", () => {
  const fixtureCount = 24;
  const dayOne = new Date("2026-10-13T15:00:00.000Z");
  const dayOneLateEvening = new Date("2026-10-14T02:59:00.000Z");
  const dayTwo = new Date("2026-10-14T03:01:00.000Z");
  const fixtureIds = Array.from({ length: fixtureCount }, (_, index) => {
    const suffix = String(index + 1).padStart(12, "0");

    return {
      accountId: `b9200000-0000-4000-8000-${suffix}`,
      authUserId: `29200000-0000-4000-8000-${suffix}`,
      creatorId: `d9200000-0000-4000-8000-${suffix}`,
      index,
    };
  });

  type DirectoryService = ReturnType<typeof createCatalogDirectoryService>;
  type DirectoryPage = Awaited<ReturnType<DirectoryService["list"]>>;

  function identify(page: DirectoryPage) {
    return page.items.map((item) =>
      item.kind === "COMPANY" ? item.companyId : item.creatorId,
    );
  }

  function expectedOrder(ids: string[], day: string) {
    const seed = directoryShuffleSeedForDay(day);

    return ids
      .map((id) => ({
        id,
        sortKey: createHash("md5").update(`${id}${seed}`).digest("hex"),
      }))
      .sort((a, b) =>
        a.sortKey === b.sortKey
          ? a.id.localeCompare(b.id)
          : a.sortKey < b.sortKey
            ? -1
            : 1,
      )
      .map((entry) => entry.id);
  }

  async function paginate(
    serviceAt: (now: Date) => DirectoryService,
    clocks: Date[],
    pageSize: number,
  ) {
    const collected: string[] = [];
    let cursor: string | undefined;
    let page = 0;

    do {
      const result: DirectoryPage = await serviceAt(
        clocks[Math.min(page, clocks.length - 1)] as Date,
      ).list({ cursor, pageSize }, `shuffle-page-${crypto.randomUUID()}`);

      collected.push(...identify(result));
      cursor = result.nextCursor ?? undefined;
      page += 1;
    } while (cursor && page < 100);

    return collected;
  }

  it("orders creators and companies by the daily md5 key and paginates consistently across seeds", async () => {
    let proof:
      | {
          createdAtOrder: string[];
          cursorSeed: string | undefined;
          dayOneAgain: string[];
          dayOneFull: string[];
          dayOneFullExpected: string[];
          dayOnePaged: string[];
          dayTwoFull: string[];
          firstPage: string[];
          kindsInFullList: string[];
          legacyFirstPage: string[];
          midnightCrossingPaged: string[];
        }
      | undefined;

    try {
      await client.database.transaction(async (transaction) => {
        for (const fixture of fixtureIds) {
          const email = `${fixture.accountId}@shuffle-fixture.contentecreators.test`;
          await transaction.execute(sql`
            insert into auth.users (
              instance_id, id, aud, role, email, encrypted_password,
              email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
              created_at, updated_at, confirmation_token, recovery_token,
              email_change_token_new, email_change
            )
            values (
              '00000000-0000-4000-8000-000000000000',
              ${fixture.authUserId},
              'authenticated', 'authenticated',
              ${email},
              extensions.crypt('LocalTest123!', extensions.gen_salt('bf')),
              now(),
              '{"provider":"email","providers":["email"]}'::jsonb,
              '{"fixture":true}'::jsonb,
              now(), now(), '', '', '', ''
            )
          `);
          await transaction.insert(accounts).values({
            approvedAt: new Date(),
            authUserId: fixture.authUserId,
            completionPercentage: 69,
            id: fixture.accountId,
            operationalEmail: email,
            role: "INFLUENCER",
            status: "APPROVED",
            submittedAt: new Date(),
          });
          await transaction.insert(creatorProfiles).values({
            accountId: fixture.accountId,
            bio: "Perfil sintético para validar a ordem diária.",
            city: "Recife",
            createdAt: new Date(
              Date.UTC(2026, 0, 1, 0, 0, 0) + fixture.index * 3_600_000,
            ),
            creatorType: "UGC",
            displayName: `Embaralhado ${String(fixture.index + 1).padStart(2, "0")}`,
            id: fixture.creatorId,
            legalName: `Embaralhado ${fixture.index + 1} Exemplo`,
            state: "PE",
            whatsappE164: `+558199999${String(1000 + fixture.index)}`,
          });
        }

        const serviceAt = (now: Date) =>
          createCatalogDirectoryService({
            list: listDirectoryPage,
            now: () => now,
            runVerifiedAccountTransaction: createRunner(
              transaction,
              approvedCreatorViewer,
            ),
          });
        const list = (now: Date, input: Record<string, unknown> = {}) =>
          serviceAt(now).list(
            { pageSize: 50, ...input },
            `shuffle-${crypto.randomUUID()}`,
          );

        const dayOneFullPage = await list(dayOne);

        if (dayOneFullPage.nextCursor) {
          throw new Error("Fixture directory must fit a single 50-item page.");
        }

        const dayOneAgain = await list(dayOneLateEvening);
        const dayTwoFull = await list(dayTwo);
        const firstPage = await list(dayOne, { pageSize: 7 });
        const legacyCursor = btoa(
          JSON.stringify({
            createdAt: "2026-01-01T00:00:00.000Z",
            id: fixtureIds[0]?.creatorId,
            kind: "CREATOR",
          }),
        )
          .replaceAll("+", "-")
          .replaceAll("/", "_")
          .replace(/=+$/u, "");
        const legacyFirstPage = await list(dayOne, {
          cursor: legacyCursor,
          pageSize: 7,
        });
        const dayOnePaged = await paginate(serviceAt, [dayOne], 7);
        // Page 1 at 23:59 (day one), every following page after midnight.
        const midnightCrossingPaged = await paginate(
          serviceAt,
          [dayOneLateEvening, dayTwo],
          7,
        );

        const dayOneIds = identify(dayOneFullPage);
        const createdAtOrder = dayOneFullPage.items
          .toSorted((a, b) =>
            a.createdAt === b.createdAt
              ? 0
              : a.createdAt < b.createdAt
                ? -1
                : 1,
          )
          .map((item) =>
            item.kind === "COMPANY" ? item.companyId : item.creatorId,
          );

        proof = {
          createdAtOrder,
          cursorSeed: firstPage.nextCursor
            ? decodeDirectoryCursor(firstPage.nextCursor)?.seed
            : undefined,
          dayOneAgain: identify(dayOneAgain),
          dayOneFull: dayOneIds,
          dayOneFullExpected: expectedOrder(dayOneIds, "2026-10-13"),
          dayOnePaged,
          dayTwoFull: identify(dayTwoFull),
          firstPage: identify(firstPage),
          kindsInFullList: [
            ...new Set(dayOneFullPage.items.map((item) => item.kind)),
          ].sort(),
          legacyFirstPage: identify(legacyFirstPage),
          midnightCrossingPaged,
        };
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) {
        throw error;
      }
    }

    expect(proof).toBeDefined();
    const result = proof as NonNullable<typeof proof>;

    // Creators and companies are interleaved in one global md5 order.
    expect(result.kindsInFullList).toEqual(["COMPANY", "CREATOR"]);
    expect(result.dayOneFull.length).toBeGreaterThanOrEqual(fixtureCount);
    expect(result.dayOneFull).toEqual(result.dayOneFullExpected);
    expect(result.dayOneFull).not.toEqual(result.createdAtOrder);

    // Same shuffle day → same order, even hours apart; another day → another.
    expect(result.dayOneAgain).toEqual(result.dayOneFull);
    expect(result.dayTwoFull).not.toEqual(result.dayOneFull);
    expect([...result.dayTwoFull].sort()).toEqual(
      [...result.dayOneFull].sort(),
    );

    // Full pagination: no duplicates, no omissions, same order as one page.
    expect(new Set(result.dayOnePaged).size).toBe(result.dayOnePaged.length);
    expect(result.dayOnePaged).toEqual(result.dayOneFull);
    expect(result.firstPage).toEqual(result.dayOneFull.slice(0, 7));

    // The cursor pins the day it was issued on, so a seed change mid-pagination
    // (page 1 before midnight, the rest after) keeps the original order.
    expect(result.cursorSeed).toBe("2026-10-13");
    expect(result.midnightCrossingPaged).toEqual(result.dayOneFull);

    // A legacy created-at cursor falls back to the first page of today's order.
    expect(result.legacyFirstPage).toEqual(result.firstPage);
  });
});

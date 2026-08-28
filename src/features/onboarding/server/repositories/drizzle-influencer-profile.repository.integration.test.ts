import { and, asc, eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import {
  accounts,
  auditRevisions,
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

import type { InfluencerProfileEditInput } from "../../schemas/influencer-profile-edit-schema";
import { createInfluencerProfileService } from "../services/influencer-profile.service";
import { createDrizzleInfluencerProfileRepository } from "./drizzle-influencer-profile.repository";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const drizzleClient = createDatabaseClient(databaseUrl);
const creatorContext: VerifiedAccountContext = {
  accountId: "b9000000-0000-4000-8000-000000000001",
  authUserId: "29000000-0000-4000-8000-000000000001",
  role: "INFLUENCER",
  status: "APPROVED",
};
const creatorProfileId = "d9000000-0000-4000-8000-000000000001";
const socialProfileId = "f9000000-0000-4000-8000-000000000001";
const requestId = "approved-influencer-profile-edit";
const rollback = new Error("rollback approved influencer profile edit");

describeLocalStack("Drizzle approved influencer profile repository", () => {
  afterAll(async () => {
    await drizzleClient.client.end({ timeout: 2 });
  });

  it("publishes an audited owner edit without resetting APPROVED and rejects a stale version", async () => {
    let proof:
      | {
          accountCompletion: {
            percentage: number;
            version: number;
          };
          accountStatus: string;
          auditRows: { entityTable: string; operation: string }[];
          metric: {
            engagementRate: string | null;
            followerCount: number | null;
            platform: string;
          };
          nicheSlugs: string[];
          profile: {
            creatorType: string;
            displayName: string;
            version: number;
          };
          social: { normalizedUrl: string; platform: string };
          staleResult: { currentVersion: number; kind: "conflict" };
          updatedVersion: number;
        }
      | undefined;

    try {
      await drizzleClient.database.transaction(async (transaction) => {
        await transaction.execute(sql`
          select
            set_config('app.audit.actor_account_id', '', true),
            set_config('app.audit.actor_type', 'SYSTEM', true),
            set_config('app.audit.actor_role', '', true),
            set_config('app.audit.source', 'SCRIPT', true),
            set_config('app.audit.request_id', 'approved-profile-edit-setup', true),
            set_config('app.audit.reason', 'Synthetic rollback-only profile edit setup', true)
        `);
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
            ${creatorContext.authUserId},
            'authenticated',
            'authenticated',
            'approved-profile-edit@contentecreators.test',
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
          authUserId: creatorContext.authUserId,
          completionPercentage: 100,
          id: creatorContext.accountId,
          operationalEmail: "approved-profile-edit@contentecreators.test",
          role: "INFLUENCER",
          status: "APPROVED",
          submittedAt: new Date(),
        });
        await transaction.insert(creatorProfiles).values({
          accountId: creatorContext.accountId,
          bio: "Perfil sintético exclusivo para edição aprovada.",
          city: "Rio de Janeiro",
          creatorType: "INFLUENCER",
          displayName: "Creator de Edição",
          id: creatorProfileId,
          legalName: "Creator de Edição Ltda.",
          state: "RJ",
          whatsappE164: "+5521999999999",
        });
        const [technologyNiche] = await transaction
          .select({ id: niches.id })
          .from(niches)
          .where(eq(niches.slug, "tecnologia"));

        if (!technologyNiche) {
          throw new Error("Expected seeded technology niche.");
        }

        await transaction.insert(creatorNiches).values({
          creatorProfileId,
          nicheId: technologyNiche.id,
        });
        await transaction.insert(socialProfiles).values({
          id: socialProfileId,
          normalizedUrl: "https://instagram.com/creator-edicao",
          ownerAccountId: creatorContext.accountId,
          platform: "INSTAGRAM",
        });
        await transaction.insert(creatorMetricSnapshots).values({
          creatorProfileId,
          engagementRate: "4.2500",
          followerCount: 12_500,
          id: "f8000000-0000-4000-8000-000000000001",
          observedOn: new Date(),
          platform: "INSTAGRAM",
          socialProfileId,
        });

        const runVerifiedTransaction: VerifiedAccountTransactionRunner = async (
          { requestId: verifiedRequestId },
          work,
        ) => {
          await transaction.execute(sql`
              select
                set_config('app.jwt.auth_user_id', ${creatorContext.authUserId}, true),
                set_config('app.jwt.account_id', ${creatorContext.accountId}, true),
                set_config('app.jwt.account_role', ${creatorContext.role}, true),
                set_config('app.jwt.account_status', ${creatorContext.status}, true),
                set_config('app.jwt.request_id', ${verifiedRequestId}, true)
            `);
          await transaction.execute(
            sql.raw("set local role contente_app_user"),
          );

          return work(transaction, creatorContext);
        };
        const service = createInfluencerProfileService({
          repository: createDrizzleInfluencerProfileRepository(),
          runVerifiedTransaction,
        });
        const initial = await service.loadOwnerProfile({
          requestId: `${requestId}-load`,
        });
        const input = {
          bio: "Crio vídeos autorais de viagem e tecnologia para marcas.",
          city: "Florianópolis",
          creatorType: "UGC",
          displayName: "Diego em Movimento",
          expectedVersion: initial.version,
          legalName: "Diego Exemplo",
          nicheSlugs: ["viagens-e-turismo", "outros"],
          otherNiche: "Artesanato sustentável",
          socialChannels: [
            {
              followerCount: 54_321,
              isPrimary: true,
              platform: "YOUTUBE",
              url: "https://youtube.com/@diego-em-movimento",
            },
          ],
          state: "SC",
          whatsapp: "(48) 99999-1111",
        } satisfies InfluencerProfileEditInput;
        const updateResult = await service.updateOwnerProfile({
          input,
          requestId,
        });

        if (updateResult.kind !== "updated") {
          throw new Error("Expected the owner edit to be published.");
        }

        const staleResult = await service.updateOwnerProfile({
          input,
          requestId: `${requestId}-stale`,
        });

        if (staleResult.kind !== "conflict") {
          throw new Error("Expected stale optimistic version conflict.");
        }

        await transaction.execute(sql.raw("reset role"));
        const [account] = await transaction
          .select({
            completionPercentage: accounts.completionPercentage,
            completionVersion: accounts.completionVersion,
            status: accounts.status,
          })
          .from(accounts)
          .where(eq(accounts.id, creatorContext.accountId));
        const [profile] = await transaction
          .select({
            creatorType: creatorProfiles.creatorType,
            displayName: creatorProfiles.displayName,
            version: creatorProfiles.version,
          })
          .from(creatorProfiles)
          .where(eq(creatorProfiles.id, creatorProfileId));
        const nicheSlugs = await transaction
          .select({ slug: niches.slug })
          .from(creatorNiches)
          .innerJoin(niches, eq(niches.id, creatorNiches.nicheId))
          .where(eq(creatorNiches.creatorProfileId, creatorProfileId))
          .orderBy(asc(niches.slug));
        const [social] = await transaction
          .select({
            normalizedUrl: socialProfiles.normalizedUrl,
            platform: socialProfiles.platform,
          })
          .from(socialProfiles)
          .where(eq(socialProfiles.ownerAccountId, creatorContext.accountId))
          .limit(1);
        const [metric] = await transaction
          .select({
            engagementRate: creatorMetricSnapshots.engagementRate,
            followerCount: creatorMetricSnapshots.followerCount,
            platform: creatorMetricSnapshots.platform,
          })
          .from(creatorMetricSnapshots)
          .where(
            and(
              eq(creatorMetricSnapshots.creatorProfileId, creatorProfileId),
              eq(creatorMetricSnapshots.socialProfileId, socialProfileId),
              eq(creatorMetricSnapshots.platform, "YOUTUBE"),
            ),
          )
          .orderBy(
            sql`${creatorMetricSnapshots.observedOn} desc`,
            sql`${creatorMetricSnapshots.createdAt} desc`,
          )
          .limit(1);
        const auditRows = await transaction
          .select({
            entityTable: auditRevisions.entityTable,
            operation: auditRevisions.operation,
          })
          .from(auditRevisions)
          .where(eq(auditRevisions.requestId, requestId))
          .orderBy(asc(auditRevisions.revision));

        if (!account || !profile || !social || !metric) {
          throw new Error("Expected the edited profile proof rows.");
        }

        proof = {
          accountCompletion: {
            percentage: account.completionPercentage,
            version: account.completionVersion,
          },
          accountStatus: account.status,
          auditRows,
          metric,
          nicheSlugs: nicheSlugs.map((niche) => niche.slug),
          profile,
          social,
          staleResult,
          updatedVersion: updateResult.profile.version,
        };
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) {
        throw error;
      }
    }

    expect(proof).toMatchObject({
      accountCompletion: {
        percentage: 69,
        version: 1,
      },
      accountStatus: "APPROVED",
      metric: {
        followerCount: 54_321,
        platform: "YOUTUBE",
      },
      nicheSlugs: [
        "personalizado-artesanato-sustentavel",
        "viagens-e-turismo",
      ],
      profile: {
        creatorType: "UGC",
        displayName: "Diego em Movimento",
      },
      social: {
        normalizedUrl: "https://youtube.com/@diego-em-movimento",
        platform: "YOUTUBE",
      },
    });
    expect(proof?.profile.version).toBe(proof?.updatedVersion);
    expect(proof?.profile.version).toBeGreaterThan(1);
    expect(proof?.staleResult).toEqual({
      currentVersion: proof?.updatedVersion,
      kind: "conflict",
    });
    expect(proof?.auditRows).toEqual(
      expect.arrayContaining([
        { entityTable: "creator_profiles", operation: "UPDATE" },
        { entityTable: "creator_niches", operation: "DELETE" },
        { entityTable: "creator_niches", operation: "INSERT" },
        { entityTable: "social_profiles", operation: "UPDATE" },
        { entityTable: "creator_metric_snapshots", operation: "INSERT" },
        { entityTable: "accounts", operation: "UPDATE" },
      ]),
    );
  });

  it("attributes a backoffice profile edit to the verified administrator", async () => {
    const repository = createDrizzleInfluencerProfileRepository();
    const targetAccountId = "b0000000-0000-4000-8000-000000000004";
    const adminAccountId = "a0000000-0000-4000-8000-000000000001";
    const adminRequestId = "admin-profile-edit-attribution";
    let proof:
      | {
          actorAccountId: string | null;
          actorRole: string | null;
          actorType: string;
          reason: string | null;
          source: string;
        }
      | undefined;

    try {
      await drizzleClient.database.transaction(async (transaction) => {
        await transaction.execute(sql`
          select
            set_config('app.jwt.auth_user_id', '10000000-0000-4000-8000-000000000001', true),
            set_config('app.jwt.account_id', ${adminAccountId}, true),
            set_config('app.jwt.account_role', 'ADMIN', true),
            set_config('app.jwt.account_status', 'APPROVED', true),
            set_config('app.jwt.request_id', ${adminRequestId}, true)
        `);
        await transaction.execute(sql.raw("set local role contente_app_user"));

        const profile = await repository.loadApprovedProfile(
          transaction,
          targetAccountId,
        );
        if (!profile) {
          throw new Error("Expected the seeded editable influencer profile.");
        }

        const result = await repository.updateApprovedProfile(
          transaction,
          targetAccountId,
          {
            ...profile,
            displayName: `${profile.displayName} revisado`,
            expectedVersion: profile.version,
          },
          adminRequestId,
          "Ajuste administrativo confirmado durante a revisão.",
          {
            actorAccountId: adminAccountId,
            actorRole: "ADMIN",
            actorType: "ADMIN",
            reason: "Ajuste administrativo confirmado durante a revisão.",
            requestId: adminRequestId,
            source: "BACKOFFICE",
          },
        );
        if (result.kind !== "updated") {
          throw new Error("Expected the administrative profile update.");
        }

        const [revision] = await transaction
          .select({
            actorAccountId: auditRevisions.actorAccountId,
            actorRole: auditRevisions.actorRole,
            actorType: auditRevisions.actorType,
            reason: auditRevisions.reason,
            source: auditRevisions.source,
          })
          .from(auditRevisions)
          .where(
            and(
              eq(auditRevisions.requestId, adminRequestId),
              eq(auditRevisions.entityTable, "creator_profiles"),
            ),
          )
          .limit(1);

        proof = revision;
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) {
        throw error;
      }
    }

    expect(proof).toEqual({
      actorAccountId: adminAccountId,
      actorRole: "ADMIN",
      actorType: "ADMIN",
      reason: "Ajuste administrativo confirmado durante a revisão.",
      source: "BACKOFFICE",
    });
  });
});

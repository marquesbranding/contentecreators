import { asc, eq, inArray, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import { accounts } from "@/db/schema";
import type { VerifiedAccountTransactionRunner } from "@/features/identity/server";
import { PROFILE_COMPLETION_VERSION } from "@/features/onboarding";

import { loadAdminAnalytics } from "./admin-analytics.repository";
import { createAdminAnalyticsService } from "./admin-analytics.service";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const client = createDatabaseClient(databaseUrl);
const rollback = new Error("rollback admin analytics integration");

describeLocalStack("Drizzle admin analytics repository", () => {
  afterAll(async () => {
    await client.client.end({ timeout: 2 });
  });

  it("applies role/status, archive, period and completion-version definitions without PII", async () => {
    let result: Awaited<ReturnType<typeof loadAdminAnalytics>> | undefined;

    try {
      await client.database.transaction(async (transaction) => {
        await transaction.execute(sql`
          select
            set_config('app.audit.actor_account_id', '', true),
            set_config('app.audit.actor_type', 'SYSTEM', true),
            set_config('app.audit.actor_role', '', true),
            set_config('app.audit.source', 'SCRIPT', true),
            set_config('app.audit.request_id', 'admin-analytics-integration', true),
            set_config('app.audit.reason', 'Rollback-only admin analytics test', true)
        `);
        const profileAccounts = await transaction
          .select({ id: accounts.id, role: accounts.role })
          .from(accounts)
          .where(inArray(accounts.role, ["INFLUENCER", "COMPANY"]))
          .orderBy(asc(accounts.id));
        const influencerIds = profileAccounts
          .filter(({ role }) => role === "INFLUENCER")
          .slice(0, 4)
          .map(({ id }) => id);
        const companyIds = profileAccounts
          .filter(({ role }) => role === "COMPANY")
          .slice(0, 4)
          .map(({ id }) => id);

        if (influencerIds.length < 4 || companyIds.length < 4) {
          throw new Error(
            "Local analytics fixtures require four profile accounts per role.",
          );
        }

        await transaction
          .update(accounts)
          .set({ archivedAt: new Date("2026-06-01T00:00:00.000Z") })
          .where(inArray(accounts.role, ["INFLUENCER", "COMPANY"]));

        const updateFixture = (
          accountId: string,
          values: Partial<typeof accounts.$inferInsert>,
        ) =>
          transaction
            .update(accounts)
            .set({ archivedAt: null, ...values })
            .where(eq(accounts.id, accountId));

        await updateFixture(influencerIds[0]!, {
          completionPercentage: 100,
          completionVersion: PROFILE_COMPLETION_VERSION,
          createdAt: new Date("2026-07-01T03:00:00.000Z"),
          status: "PENDING_REVIEW",
        });
        await updateFixture(influencerIds[1]!, {
          completionPercentage: 50,
          completionVersion: PROFILE_COMPLETION_VERSION,
          createdAt: new Date("2026-07-15T12:00:00.000Z"),
          status: "CHANGES_REQUESTED",
        });
        await updateFixture(influencerIds[2]!, {
          completionPercentage: 99,
          completionVersion: PROFILE_COMPLETION_VERSION + 1,
          createdAt: new Date("2026-08-01T03:00:00.000Z"),
          status: "APPROVED",
        });
        await updateFixture(influencerIds[3]!, {
          archivedAt: new Date("2026-07-20T00:00:00.000Z"),
          completionPercentage: 100,
          completionVersion: PROFILE_COMPLETION_VERSION,
          createdAt: new Date("2026-07-10T12:00:00.000Z"),
          status: "PENDING_REVIEW",
        });
        await updateFixture(companyIds[0]!, {
          completionPercentage: 0,
          completionVersion: PROFILE_COMPLETION_VERSION,
          createdAt: new Date("2026-08-01T02:59:59.999Z"),
          status: "PENDING_REVIEW",
        });
        await updateFixture(companyIds[1]!, {
          completionPercentage: 50,
          completionVersion: PROFILE_COMPLETION_VERSION,
          createdAt: new Date("2026-07-01T02:59:59.999Z"),
          status: "APPROVED",
        });
        await updateFixture(companyIds[2]!, {
          completionPercentage: 100,
          completionVersion: PROFILE_COMPLETION_VERSION,
          createdAt: new Date("2026-07-20T12:00:00.000Z"),
          status: "ONBOARDING",
        });
        await updateFixture(companyIds[3]!, {
          archivedAt: new Date("2026-07-20T00:00:00.000Z"),
          completionPercentage: 100,
          completionVersion: PROFILE_COMPLETION_VERSION,
          createdAt: new Date("2026-07-20T12:00:00.000Z"),
          status: "BANNED",
        });

        const runVerifiedAccountTransaction: VerifiedAccountTransactionRunner =
          async (_input, work) =>
            work(transaction, {
              accountId: "a0000000-0000-4000-8000-000000000001",
              authUserId: "10000000-0000-4000-8000-000000000001",
              role: "ADMIN",
              status: "APPROVED",
            });
        const service = createAdminAnalyticsService({
          completionVersion: PROFILE_COMPLETION_VERSION,
          load: loadAdminAnalytics,
          runVerifiedAccountTransaction,
        });

        result = await service.get(
          { fromDate: "2026-07-01", throughDate: "2026-07-31" },
          "admin-analytics-integration",
        );
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) {
        throw error;
      }
    }

    expect(result).toMatchObject({
      byRole: {
        COMPANY: {
          byStatus: {
            APPROVED: 1,
            BANNED: 0,
            ONBOARDING: 1,
            PENDING_REVIEW: 1,
          },
          total: 3,
        },
        INFLUENCER: {
          byStatus: {
            APPROVED: 1,
            CHANGES_REQUESTED: 1,
            PENDING_REVIEW: 1,
          },
          total: 3,
        },
      },
      completion: {
        calculatorVersion: PROFILE_COMPLETION_VERSION,
        completedProfiles: 2,
        percentage: 60,
        totalProfiles: 5,
      },
      newRegistrations: {
        byRole: { COMPANY: 2, INFLUENCER: 2 },
        total: 4,
      },
      totals: {
        awaitingApproval: 2,
        companies: 3,
        influencers: 3,
      },
    });
    expect(JSON.stringify(result)).not.toMatch(
      /accountId|authUserId|email|name|cnpj|whatsapp|objectPath/i,
    );
  });
});

import { asc, eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import {
  accounts,
  auditRevisions,
  companyLocations,
  companyProfiles,
  socialProfiles,
} from "@/db/schema";
import type {
  VerifiedAccountContext,
  VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import type { CompanyProfileEditInput } from "../../schemas/company-profile-edit-schema";
import { createCompanyProfileService } from "../services/company-profile.service";
import { createDrizzleCompanyProfileRepository } from "./drizzle-company-profile.repository";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const drizzleClient = createDatabaseClient(databaseUrl);
const companyContext: VerifiedAccountContext = {
  accountId: "c0000000-0000-4000-8000-000000000004",
  authUserId: "30000000-0000-4000-8000-000000000004",
  role: "COMPANY",
  status: "APPROVED",
};
const companyProfileId = "e0000000-0000-4000-8000-000000000004";
const requestId = "approved-company-profile-edit";
const rollback = new Error("rollback approved company profile edit");

describeLocalStack("Drizzle approved company profile repository", () => {
  afterAll(async () => {
    await drizzleClient.client.end({ timeout: 2 });
  });

  it("publishes audited company, location and social edits without resetting APPROVED", async () => {
    let proof:
      | {
          accountStatus: string;
          auditRows: { entityTable: string; operation: string }[];
          locationCount: number;
          primaryCount: number;
          profile: { tradeName: string; version: number };
          social: { normalizedUrl: string; platform: string };
          staleResult: { currentVersion: number; kind: "conflict" };
        }
      | undefined;

    try {
      await drizzleClient.database.transaction(async (transaction) => {
        const runVerifiedTransaction: VerifiedAccountTransactionRunner = async (
          { requestId: verifiedRequestId },
          work,
        ) => {
          await transaction.execute(sql`
              select
                set_config('app.jwt.auth_user_id', ${companyContext.authUserId}, true),
                set_config('app.jwt.account_id', ${companyContext.accountId}, true),
                set_config('app.jwt.account_role', ${companyContext.role}, true),
                set_config('app.jwt.account_status', ${companyContext.status}, true),
                set_config('app.jwt.request_id', ${verifiedRequestId}, true)
            `);
          await transaction.execute(
            sql.raw("set local role contente_app_user"),
          );
          return work(transaction, companyContext);
        };
        const service = createCompanyProfileService({
          repository: createDrizzleCompanyProfileRepository(),
          runVerifiedTransaction,
        });
        const initial = await service.loadOwnerProfile({
          requestId: `${requestId}-load`,
        });
        const input = {
          additionalLocations: [
            {
              city: "Curitiba",
              complement: "",
              label: "Filial Sul",
              neighborhood: "Centro",
              number: "120",
              postalCode: "80010000",
              state: "PR",
              street: "Rua das Flores",
            },
          ],
          city: "São Paulo",
          cnpj: initial.cnpj,
          complement: "8º andar",
          description:
            "Empresa atualizada que conecta marcas a creators em todo o Brasil.",
          employeeRange: "51_TO_200",
          expectedVersion: initial.version,
          legalName: "Empresa Quatro Exemplo Ltda.",
          neighborhood: "Centro",
          number: "400",
          postalCode: "01001000",
          segment: "Marketing",
          socialPlatform: "LINKEDIN",
          socialUrl: "https://linkedin.com/company/empresa-quatro",
          state: "SP",
          street: "Praça da Sé",
          tradeName: "Empresa Quatro Atualizada",
          websiteUrl: "https://empresa-quatro.example/",
          whatsapp: "(11) 98888-4444",
        } satisfies CompanyProfileEditInput;
        const updateResult = await service.updateOwnerProfile({
          input,
          requestId,
        });

        if (updateResult.kind !== "updated") {
          throw new Error("Expected the company edit to be published.");
        }

        const staleResult = await service.updateOwnerProfile({
          input,
          requestId: `${requestId}-stale`,
        });
        if (staleResult.kind !== "conflict") {
          throw new Error("Expected stale company version conflict.");
        }

        await transaction.execute(sql.raw("reset role"));
        const [account] = await transaction
          .select({ status: accounts.status })
          .from(accounts)
          .where(eq(accounts.id, companyContext.accountId));
        const [profile] = await transaction
          .select({
            tradeName: companyProfiles.tradeName,
            version: companyProfiles.version,
          })
          .from(companyProfiles)
          .where(eq(companyProfiles.id, companyProfileId));
        const [locationCounts] = await transaction
          .select({
            locationCount: sql<number>`count(*) filter (where ${companyLocations.archivedAt} is null)::integer`,
            primaryCount: sql<number>`count(*) filter (where ${companyLocations.isPrimary} and ${companyLocations.archivedAt} is null)::integer`,
          })
          .from(companyLocations)
          .where(eq(companyLocations.companyProfileId, companyProfileId));
        const [social] = await transaction
          .select({
            normalizedUrl: socialProfiles.normalizedUrl,
            platform: socialProfiles.platform,
          })
          .from(socialProfiles)
          .where(eq(socialProfiles.ownerAccountId, companyContext.accountId))
          .limit(1);
        const auditRows = await transaction
          .select({
            entityTable: auditRevisions.entityTable,
            operation: auditRevisions.operation,
          })
          .from(auditRevisions)
          .where(eq(auditRevisions.requestId, requestId))
          .orderBy(asc(auditRevisions.revision));

        if (!account || !profile || !locationCounts || !social) {
          throw new Error("Expected the company edit proof rows.");
        }

        proof = {
          accountStatus: account.status,
          auditRows,
          locationCount: locationCounts.locationCount,
          primaryCount: locationCounts.primaryCount,
          profile,
          social,
          staleResult,
        };
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) {
        throw error;
      }
    }

    expect(proof).toMatchObject({
      accountStatus: "APPROVED",
      locationCount: 2,
      primaryCount: 1,
      profile: { tradeName: "Empresa Quatro Atualizada" },
      social: {
        normalizedUrl: "https://linkedin.com/company/empresa-quatro",
        platform: "LINKEDIN",
      },
    });
    expect(proof?.staleResult).toEqual({
      currentVersion: proof?.profile.version,
      kind: "conflict",
    });
    expect(proof?.auditRows).toEqual(
      expect.arrayContaining([
        { entityTable: "company_profiles", operation: "UPDATE" },
        { entityTable: "company_locations", operation: "UPDATE" },
        { entityTable: "company_locations", operation: "INSERT" },
        { entityTable: "social_profiles", operation: "INSERT" },
      ]),
    );
    expect(proof?.auditRows).not.toContainEqual(
      expect.objectContaining({ entityTable: "accounts" }),
    );
  });
});

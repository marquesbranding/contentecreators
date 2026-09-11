import { inArray, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import { accounts, companyProfiles } from "@/db/schema";
import { authUsers } from "@/db/schema/auth";
import { insertAuthIdentity } from "@/test/local-stack-fixtures";

import { loadPublicCommunityProof } from "./drizzle-public-community-proof.repository";

const integrationEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeIntegration = integrationEnabled ? describe : describe.skip;
const database = createDatabaseClient(
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
);

describeIntegration("public community proof repository", () => {
  afterAll(async () => {
    await database.client.end({ timeout: 2 });
  });

  it("puts only approved, complete companies in the marquee", async () => {
    const suffix = crypto.randomUUID();
    const identities = [crypto.randomUUID(), crypto.randomUUID()];
    const cnpjSeed = `${Date.now()}`.slice(-12);

    try {
      for (const [index, identityId] of identities.entries()) {
        await insertAuthIdentity(
          database.database,
          identityId,
          `marquee-${index}-${suffix}@example.test`,
        );
      }

      const [complete, incomplete] = await database.database
        .insert(accounts)
        .values([
          {
            approvedAt: new Date(),
            authUserId: identities[0]!,
            completionPercentage: 100,
            operationalEmail: `marquee-complete-${suffix}@example.test`,
            role: "COMPANY" as const,
            status: "APPROVED" as const,
          },
          {
            approvedAt: new Date(),
            authUserId: identities[1]!,
            completionPercentage: 80,
            operationalEmail: `marquee-incomplete-${suffix}@example.test`,
            role: "COMPANY" as const,
            status: "APPROVED" as const,
          },
        ])
        .returning({ id: accounts.id });

      await database.database.insert(companyProfiles).values([
        {
          accountId: complete!.id,
          cnpj: `71${cnpjSeed}`,
          legalName: "Completa Fixture LTDA",
          tradeName: `Completa ${suffix}`,
        },
        {
          accountId: incomplete!.id,
          cnpj: `72${cnpjSeed}`,
          legalName: "Incompleta Fixture LTDA",
          tradeName: `Incompleta ${suffix}`,
        },
      ]);

      const proof = await loadPublicCommunityProof(database.database);
      const tradeNames = proof.companies.map((company) => company.tradeName);

      expect(Object.keys(proof)).toEqual(["companies"]);
      expect(tradeNames).toContain(`Completa ${suffix}`);
      expect(tradeNames).not.toContain(`Incompleta ${suffix}`);
    } finally {
      await database.database.execute(sql`
        delete from public.company_profiles where trade_name like ${`%${suffix}`}
      `);
      await database.database
        .delete(accounts)
        .where(inArray(accounts.authUserId, identities));
      await database.database
        .delete(authUsers)
        .where(inArray(authUsers.id, identities));
    }
  });
});

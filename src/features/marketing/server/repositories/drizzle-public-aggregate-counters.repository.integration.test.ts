import { inArray, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import { accounts } from "@/db/schema";
import { authUsers } from "@/db/schema/auth";

import { loadApprovedPublicCounts } from "./drizzle-public-aggregate-counters.repository";

const integrationEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeIntegration = integrationEnabled ? describe : describe.skip;
const database = createDatabaseClient(
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
);

describeIntegration("public aggregate counters repository", () => {
  afterAll(async () => {
    await database.client.end({ timeout: 2 });
  });

  it("counts only approved, active creator and company accounts", async () => {
    await database.database.execute(sql`
      delete from auth.users
      where email like 'aggregate-%@example.test'
        and not exists (
          select 1 from public.accounts
          where public.accounts.auth_user_id = auth.users.id
        )
    `);
    const before = await loadApprovedPublicCounts(database.database);
    const suffix = crypto.randomUUID();
    const identities = [
      crypto.randomUUID(),
      crypto.randomUUID(),
      crypto.randomUUID(),
      crypto.randomUUID(),
    ];

    try {
      for (const identityId of identities) {
        await database.database.execute(sql`
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
            ${identityId},
            'authenticated',
            'authenticated',
            ${`aggregate-${identityId}@example.test`},
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
      }
      await database.database.insert(accounts).values([
        {
          authUserId: identities[0],
          operationalEmail: `approved-creator-${suffix}@example.test`,
          role: "INFLUENCER",
          status: "APPROVED",
        },
        {
          authUserId: identities[1],
          operationalEmail: `pending-creator-${suffix}@example.test`,
          role: "INFLUENCER",
          status: "PENDING_REVIEW",
        },
        {
          archivedAt: new Date(),
          authUserId: identities[2],
          operationalEmail: `archived-company-${suffix}@example.test`,
          role: "COMPANY",
          status: "APPROVED",
        },
        {
          authUserId: identities[3],
          operationalEmail: `approved-company-${suffix}@example.test`,
          role: "COMPANY",
          status: "APPROVED",
        },
      ]);

      const after = await loadApprovedPublicCounts(database.database);

      expect(after).toEqual({
        approvedCompanies: before.approvedCompanies + 1,
        approvedCreators: before.approvedCreators + 1,
      });
    } finally {
      await database.database
        .delete(accounts)
        .where(inArray(accounts.authUserId, identities));
      await database.database
        .delete(authUsers)
        .where(inArray(authUsers.id, identities));
    }
  });
});

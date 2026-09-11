import { eq, inArray, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import { accounts, creatorProfiles } from "@/db/schema";
import { authUsers } from "@/db/schema/auth";
import { insertAuthIdentity } from "@/test/local-stack-fixtures";

import type { LandingShowcaseCommand } from "../../api/landing-showcase-management.contract";
import { drizzleLandingShowcaseRepository } from "./drizzle-landing-showcase.repository";
import { LandingShowcaseRepositoryError } from "./landing-showcase.repository";

const integrationEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeIntegration = integrationEnabled ? describe : describe.skip;
const database = createDatabaseClient(
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
);

async function profileState(profileId: string) {
  const [row] = await database.database
    .select({
      enabled: creatorProfiles.isFeatured,
      position: creatorProfiles.featureOrder,
      version: creatorProfiles.version,
    })
    .from(creatorProfiles)
    .where(eq(creatorProfiles.id, profileId));

  return row!;
}

async function run(
  action: LandingShowcaseCommand["action"],
  profileId: string,
  expectedVersion?: number,
) {
  const version = expectedVersion ?? (await profileState(profileId)).version;

  await database.database.transaction((transaction) =>
    drizzleLandingShowcaseRepository.applyCommand(transaction, {
      action,
      expectedVersion: version,
      kind: "CREATOR",
      profileId,
    }),
  );
}

describeIntegration("landing showcase management repository", () => {
  afterAll(async () => {
    await database.client.end({ timeout: 2 });
  });

  it("enables, reorders and removes creators while keeping positions dense", async () => {
    const suffix = crypto.randomUUID();
    const identities = Array.from({ length: 4 }, () => crypto.randomUUID());

    try {
      for (const [index, identityId] of identities.entries()) {
        await insertAuthIdentity(
          database.database,
          identityId,
          `manage-${index}-${suffix}@example.test`,
        );
      }

      const created = await database.database
        .insert(accounts)
        .values(
          identities.map((identityId, index) => ({
            approvedAt: new Date(),
            authUserId: identityId,
            operationalEmail: `manage-account-${index}-${suffix}@example.test`,
            role: "INFLUENCER" as const,
            status:
              index === 3 ? ("PENDING_REVIEW" as const) : ("APPROVED" as const),
          })),
        )
        .returning({ id: accounts.id });
      const profiles = await database.database
        .insert(creatorProfiles)
        .values(
          created.map((account, index) => ({
            accountId: account.id,
            creatorType: "INFLUENCER" as const,
            displayName: `Gestao ${index} ${suffix}`,
            legalName: `Gestao Fixture ${index}`,
          })),
        )
        .returning({ id: creatorProfiles.id });
      const [first, second, third, pending] = profiles.map(
        (profile) => profile.id,
      );

      await run("ENABLE", first!);
      await run("ENABLE", second!);
      await run("ENABLE", third!);

      const base = (await profileState(first!)).position!;

      // Enabling appends to the end of the carousel.
      expect((await profileState(second!)).position).toBe(base + 1);
      expect((await profileState(third!)).position).toBe(base + 2);

      await run("MOVE_UP", third!);

      expect((await profileState(third!)).position).toBe(base + 1);
      expect((await profileState(second!)).position).toBe(base + 2);

      await run("DISABLE", first!);

      // Removing closes the gap instead of leaving a hole in the order.
      expect(await profileState(first!)).toMatchObject({
        enabled: false,
        position: null,
      });
      expect((await profileState(third!)).position).toBe(base);
      expect((await profileState(second!)).position).toBe(base + 1);

      await expect(run("MOVE_UP", first!)).rejects.toEqual(
        new LandingShowcaseRepositoryError("NOT_ENABLED"),
      );
      await expect(run("ENABLE", pending!)).rejects.toEqual(
        new LandingShowcaseRepositoryError("NOT_FOUND"),
      );
      await expect(run("DISABLE", second!, 1)).rejects.toEqual(
        new LandingShowcaseRepositoryError("VERSION_CONFLICT"),
      );

      const lists = await database.database.transaction((transaction) =>
        drizzleLandingShowcaseRepository.listCandidates(transaction),
      );
      const mine = lists.creators.filter((candidate) =>
        candidate.displayName.endsWith(suffix),
      );

      // Enabled first in carousel order; the pending account is not a candidate.
      expect(mine.map((candidate) => candidate.profileId)).toEqual([
        third,
        second,
        first,
      ]);
    } finally {
      await database.database.execute(sql`
        delete from public.creator_profiles where display_name like ${`%${suffix}`}
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

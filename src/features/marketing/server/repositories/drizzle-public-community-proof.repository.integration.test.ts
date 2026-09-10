import { inArray, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import { accounts, creatorProfiles, mediaAssets } from "@/db/schema";
import { authUsers } from "@/db/schema/auth";

import { loadPublicCommunityProof } from "./drizzle-public-community-proof.repository";

const integrationEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeIntegration = integrationEnabled ? describe : describe.skip;
const database = createDatabaseClient(
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
);

async function insertIdentity(identityId: string) {
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
      ${`proof-${identityId}@example.test`},
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

/**
 * Approved influencer accounts, approved just now so they outrank whatever the
 * local seed already holds and land inside `PUBLIC_PROOF_CREATOR_LIMIT`.
 */
async function insertApprovedCreatorAccounts(count: number, suffix: string) {
  const identities = Array.from({ length: count }, () => crypto.randomUUID());

  for (const identityId of identities) {
    await insertIdentity(identityId);
  }

  const created = await database.database
    .insert(accounts)
    .values(
      identities.map((identityId, index) => ({
        approvedAt: new Date(),
        authUserId: identityId,
        operationalEmail: `proof-${index}-${suffix}@example.test`,
        role: "INFLUENCER" as const,
        status: "APPROVED" as const,
      })),
    )
    .returning({ id: accounts.id });

  return { created, identities };
}

async function insertActiveAvatar(ownerAccountId: string, objectPath: string) {
  const [asset] = await database.database
    .insert(mediaAssets)
    .values({
      bucketName: "profile-media",
      height: 512,
      kind: "AVATAR" as const,
      mimeType: "image/webp",
      objectPath,
      ownerAccountId,
      sizeBytes: 1_024,
      status: "ACTIVE" as const,
      width: 512,
    })
    .returning({ id: mediaAssets.id });

  return asset!.id;
}

async function cleanUp(identities: string[], suffix: string) {
  await database.database.execute(sql`
    delete from public.creator_profiles where display_name like ${`%${suffix}`}
  `);
  await database.database.execute(sql`
    delete from public.media_assets where object_path like ${`%${suffix}.webp`}
  `);
  await database.database
    .delete(accounts)
    .where(inArray(accounts.authUserId, identities));
  await database.database
    .delete(authUsers)
    .where(inArray(authUsers.id, identities));
}

describeIntegration("public community proof repository", () => {
  afterAll(async () => {
    await database.client.end({ timeout: 2 });
  });

  it("resolves the avatar of a curated creator only while the asset is active", async () => {
    const suffix = crypto.randomUUID();
    const { created, identities } = await insertApprovedCreatorAccounts(
      3,
      suffix,
    );
    const [withPhoto, withArchivedAsset, withoutAsset] = created;

    try {
      const activeAssetId = await insertActiveAvatar(
        withPhoto!.id,
        `${withPhoto!.id}/avatar-${suffix}.webp`,
      );
      const archivedAssetId = await insertActiveAvatar(
        withArchivedAsset!.id,
        `${withArchivedAsset!.id}/avatar-${suffix}.webp`,
      );

      await database.database.execute(sql`
        update public.media_assets set archived_at = now() where id = ${archivedAssetId}
      `);

      await database.database.insert(creatorProfiles).values([
        {
          accountId: withPhoto!.id,
          avatarAssetId: activeAssetId,
          creatorType: "INFLUENCER",
          displayName: `Curada ${suffix}`,
          featureOrder: 1,
          isFeatured: true,
          legalName: "Curada Fixture",
        },
        {
          accountId: withArchivedAsset!.id,
          avatarAssetId: archivedAssetId,
          creatorType: "UGC",
          displayName: `Arquivada ${suffix}`,
          featureOrder: 2,
          isFeatured: true,
          legalName: "Arquivada Fixture",
        },
        {
          accountId: withoutAsset!.id,
          creatorType: "INFLUENCER",
          displayName: `Sem foto ${suffix}`,
          featureOrder: 3,
          isFeatured: true,
          legalName: "Sem foto Fixture",
        },
      ]);

      const proof = await loadPublicCommunityProof(database.database);
      const byName = new Map(
        proof.creators.map((creator) => [creator.displayName, creator]),
      );

      /* Curated creators sort first, so all three fill the public limit —
       * assert presence explicitly so a missing row cannot pass as "no photo". */
      expect(byName.get(`Curada ${suffix}`)).toBeDefined();
      expect(byName.get(`Arquivada ${suffix}`)).toBeDefined();
      expect(byName.get(`Sem foto ${suffix}`)).toBeDefined();

      expect(byName.get(`Curada ${suffix}`)?.avatarSource).toEqual({
        bucketName: "profile-media",
        height: 512,
        objectPath: `${withPhoto!.id}/avatar-${suffix}.webp`,
        width: 512,
      });
      expect(byName.get(`Arquivada ${suffix}`)?.avatarSource).toBeNull();
      expect(byName.get(`Sem foto ${suffix}`)?.avatarSource).toBeNull();
    } finally {
      await cleanUp(identities, suffix);
    }
  });

  it("withholds the avatar of an approved creator the backoffice has not curated", async () => {
    const suffix = crypto.randomUUID();
    const { created, identities } = await insertApprovedCreatorAccounts(
      1,
      suffix,
    );
    const [uncurated] = created;

    try {
      const assetId = await insertActiveAvatar(
        uncurated!.id,
        `${uncurated!.id}/avatar-${suffix}.webp`,
      );

      await database.database.insert(creatorProfiles).values({
        accountId: uncurated!.id,
        avatarAssetId: assetId,
        creatorType: "UGC",
        displayName: `Comum ${suffix}`,
        isFeatured: false,
        legalName: "Comum Fixture",
      });

      const proof = await loadPublicCommunityProof(database.database);
      const uncuratedCreator = proof.creators.find(
        (creator) => creator.displayName === `Comum ${suffix}`,
      );

      /* Approval alone must never publish a face: this creator has an active
       * avatar and is listed publicly, but was not curated. */
      expect(uncuratedCreator).toBeDefined();
      expect(uncuratedCreator?.avatarSource).toBeNull();
    } finally {
      await cleanUp(identities, suffix);
    }
  });
});

import { inArray, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import {
  accounts,
  companyProfiles,
  creatorProfiles,
  mediaAssets,
} from "@/db/schema";
import { authUsers } from "@/db/schema/auth";
import { insertAuthIdentity } from "@/test/local-stack-fixtures";

import { loadPublicLandingShowcaseSource } from "./drizzle-public-landing-showcase.repository";

const integrationEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeIntegration = integrationEnabled ? describe : describe.skip;
const database = createDatabaseClient(
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
);

describeIntegration("public landing showcase repository", () => {
  afterAll(async () => {
    await database.client.end({ timeout: 2 });
  });

  it("serves only enabled, still-eligible profiles in backoffice order", async () => {
    const suffix = crypto.randomUUID();
    const identities = Array.from({ length: 6 }, () => crypto.randomUUID());
    const cnpjSeed = `${Date.now()}`.slice(-12);

    try {
      for (const [index, identityId] of identities.entries()) {
        await insertAuthIdentity(
          database.database,
          identityId,
          `showcase-${index}-${suffix}@example.test`,
        );
      }

      const [
        firstCreator,
        secondCreator,
        pendingCreator,
        hiddenCreator,
        company,
        incompleteCompany,
      ] = await database.database
        .insert(accounts)
        .values([
          {
            approvedAt: new Date(),
            authUserId: identities[0]!,
            operationalEmail: `showcase-first-${suffix}@example.test`,
            role: "INFLUENCER" as const,
            status: "APPROVED" as const,
          },
          {
            approvedAt: new Date(),
            authUserId: identities[1]!,
            operationalEmail: `showcase-second-${suffix}@example.test`,
            role: "INFLUENCER" as const,
            status: "APPROVED" as const,
          },
          {
            authUserId: identities[2]!,
            operationalEmail: `showcase-pending-${suffix}@example.test`,
            role: "INFLUENCER" as const,
            status: "PENDING_REVIEW" as const,
          },
          {
            approvedAt: new Date(),
            authUserId: identities[3]!,
            operationalEmail: `showcase-hidden-${suffix}@example.test`,
            role: "INFLUENCER" as const,
            status: "APPROVED" as const,
          },
          {
            approvedAt: new Date(),
            authUserId: identities[4]!,
            completionPercentage: 100,
            operationalEmail: `showcase-company-${suffix}@example.test`,
            role: "COMPANY" as const,
            status: "APPROVED" as const,
          },
          {
            approvedAt: new Date(),
            authUserId: identities[5]!,
            completionPercentage: 60,
            operationalEmail: `showcase-incomplete-${suffix}@example.test`,
            role: "COMPANY" as const,
            status: "APPROVED" as const,
          },
        ])
        .returning({ id: accounts.id });

      const [avatar, logo] = await database.database
        .insert(mediaAssets)
        .values([
          {
            bucketName: "profile-media",
            height: 512,
            kind: "AVATAR" as const,
            mimeType: "image/webp",
            objectPath: `${secondCreator!.id}/avatar-${suffix}.webp`,
            ownerAccountId: secondCreator!.id,
            sizeBytes: 1_024,
            status: "ACTIVE" as const,
            width: 512,
          },
          {
            bucketName: "profile-media",
            height: 256,
            kind: "LOGO" as const,
            mimeType: "image/webp",
            objectPath: `${company!.id}/logo-${suffix}.webp`,
            ownerAccountId: company!.id,
            sizeBytes: 1_024,
            status: "ACTIVE" as const,
            width: 256,
          },
        ])
        .returning({ id: mediaAssets.id });

      await database.database.insert(creatorProfiles).values([
        {
          accountId: firstCreator!.id,
          creatorType: "INFLUENCER",
          displayName: `Primeira ${suffix}`,
          featureOrder: 901,
          isFeatured: true,
          legalName: "Primeira Fixture",
          whatsappE164: "+5511999990001",
        },
        {
          accountId: secondCreator!.id,
          avatarAssetId: avatar!.id,
          creatorType: "UGC",
          displayName: `Segunda ${suffix}`,
          featureOrder: 900,
          isFeatured: true,
          legalName: "Segunda Fixture",
        },
        {
          accountId: pendingCreator!.id,
          creatorType: "UGC",
          displayName: `Pendente ${suffix}`,
          featureOrder: 902,
          isFeatured: true,
          legalName: "Pendente Fixture",
        },
        {
          accountId: hiddenCreator!.id,
          creatorType: "UGC",
          displayName: `Oculta ${suffix}`,
          isFeatured: false,
          legalName: "Oculta Fixture",
        },
      ]);
      await database.database.insert(companyProfiles).values([
        {
          accountId: company!.id,
          cnpj: `73${cnpjSeed}`,
          featureOrder: 900,
          isFeatured: true,
          legalName: "Vitrine Fixture LTDA",
          logoAssetId: logo!.id,
          tradeName: `Vitrine ${suffix}`,
          whatsappE164: "+5511999990002",
        },
        {
          accountId: incompleteCompany!.id,
          cnpj: `74${cnpjSeed}`,
          featureOrder: 901,
          isFeatured: true,
          legalName: "Incompleta Fixture LTDA",
          tradeName: `Incompleta ${suffix}`,
        },
      ]);

      const source = await loadPublicLandingShowcaseSource(database.database);
      const creators = source.creators.filter((creator) =>
        creator.displayName.endsWith(suffix),
      );
      const companies = source.companies.filter((entry) =>
        entry.tradeName.endsWith(suffix),
      );

      /* Order comes from the backoffice (`feature_order`), not approval date;
       * pending and not-enabled creators and incomplete companies stay out. */
      expect(creators.map((creator) => creator.displayName)).toEqual([
        `Segunda ${suffix}`,
        `Primeira ${suffix}`,
      ]);
      expect(creators[0]?.avatarSource).toEqual({
        bucketName: "profile-media",
        height: 512,
        objectPath: `${secondCreator!.id}/avatar-${suffix}.webp`,
        width: 512,
      });
      expect(creators[1]?.avatarSource ?? null).toBeNull();
      expect(companies.map((entry) => entry.tradeName)).toEqual([
        `Vitrine ${suffix}`,
      ]);
      expect(companies[0]?.logoSource).toMatchObject({
        objectPath: `${company!.id}/logo-${suffix}.webp`,
      });
      // Contact data never enters the public payload, even when on file.
      expect(JSON.stringify(source)).not.toMatch(/whatsapp|\+55119999900/iu);
    } finally {
      await database.database.execute(sql`
        delete from public.creator_profiles where display_name like ${`%${suffix}`}
      `);
      await database.database.execute(sql`
        delete from public.company_profiles where trade_name like ${`%${suffix}`}
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
  });
});

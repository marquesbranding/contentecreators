import "server-only";

import { readFile } from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";
import { eq, sql } from "drizzle-orm";

import { createDatabaseClient } from "@/db/client";
import {
  accounts,
  companyProfiles,
  creatorMetricSnapshots,
  creatorProfiles,
  mediaAssets,
  socialProfiles,
} from "@/db/schema";
import { parseServerEnv } from "@/shared/lib/env/server-env-schema";

/**
 * Local-only fixture for the public landing's "Creators e marcas em destaque"
 * section, so both of its data sources have something to show:
 *
 * - one seeded creator enabled in the landing carousel (`is_featured`, the flag
 *   the backoffice "Gestão da landing" page toggles) with an active avatar, so
 *   the carousel renders a signed photo;
 * - several approved, complete companies, so the brand marquee rotates names.
 *
 * - four extra approved creators with a photo and complete Instagram metrics,
 *   mixing the CDL and Jornada do Influenciador badges, so the catalog has
 *   enough profiles for the featured row and the mid-list sponsored cards.
 *
 * Everything else on the carousel is meant to be managed through the
 * backoffice; this only saves a few clicks after a local database reset.
 *
 * Usage:
 *   npm run local:showcase
 *   npm run local:showcase -- --clear
 */
const FEATURED_DISPLAY_NAME = "Gabi Conecta";
const FIXTURE_EMAIL_DOMAIN = "showcase.local.test";
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

const FIXTURE_CREATORS = [
  {
    city: "São Paulo",
    cdl: true,
    handle: "marina_viaja",
    journey: true,
    name: "Marina Viaja",
    state: "SP",
  },
  {
    city: "Curitiba",
    cdl: false,
    handle: "theo_tech",
    journey: true,
    name: "Theo Tech",
    state: "PR",
  },
  {
    city: "Recife",
    cdl: true,
    handle: "lia_receitas",
    journey: false,
    name: "Lia Receitas",
    state: "PE",
  },
  {
    city: "Porto Alegre",
    cdl: false,
    handle: "caio_fit",
    journey: false,
    name: "Caio Fit",
    state: "RS",
  },
] as const;

const FIXTURE_COMPANIES = [
  { cnpj: "90000000000101", segment: "Moda", tradeName: "Raiz Studio" },
  {
    cnpj: "90000000000102",
    segment: "Alimentação",
    tradeName: "Padoca do Vale",
  },
  {
    cnpj: "90000000000103",
    segment: "Tecnologia",
    tradeName: "Nortec Sistemas",
  },
  { cnpj: "90000000000104", segment: "Beleza", tradeName: "Casa Bloom" },
  {
    cnpj: "90000000000105",
    segment: "Turismo",
    tradeName: "Serra Viva Turismo",
  },
] as const;

function assertLocalEnvironment() {
  const environment = parseServerEnv(process.env);
  const supabaseUrl = new URL(environment.NEXT_PUBLIC_SUPABASE_URL);

  if (
    environment.APP_ENV !== "local" ||
    !LOCAL_HOSTS.has(supabaseUrl.hostname)
  ) {
    throw new Error("This fixture only runs against a local Supabase.");
  }

  return environment;
}

async function insertIdentity(
  db: ReturnType<typeof createDatabaseClient>,
  identityId: string,
  email: string,
) {
  await db.database.execute(sql`
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    )
    values (
      '00000000-0000-4000-8000-000000000000', ${identityId}, 'authenticated',
      'authenticated', ${email},
      extensions.crypt('LocalTest123!', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"fixture":true}'::jsonb, now(), now(), '', '', '', ''
    )
  `);
}

async function clearFixtures(db: ReturnType<typeof createDatabaseClient>) {
  const [profile] = await db.database
    .select({ id: creatorProfiles.id })
    .from(creatorProfiles)
    .where(eq(creatorProfiles.displayName, FEATURED_DISPLAY_NAME));

  if (profile) {
    await db.database
      .update(creatorProfiles)
      .set({ avatarAssetId: null, featureOrder: null, isFeatured: false })
      .where(eq(creatorProfiles.id, profile.id));
  }

  await db.database.execute(sql`
    delete from public.media_assets
    where object_path like '%/avatar/local-featured-fixture.png'
  `);
  await clearFixtureCreators(db);
  await db.database.execute(sql`
    delete from public.company_profiles
    where cnpj in ${FIXTURE_COMPANIES.map((company) => company.cnpj)}
  `);
  await db.database.execute(sql`
    delete from public.accounts
    where operational_email like ${`%@${FIXTURE_EMAIL_DOMAIN}`}
  `);
  await db.database.execute(sql`
    delete from auth.users where email like ${`%@${FIXTURE_EMAIL_DOMAIN}`}
  `);
}

async function seedFeaturedCreator(
  db: ReturnType<typeof createDatabaseClient>,
  storage: ReturnType<typeof createClient>["storage"],
) {
  const [profile] = await db.database
    .select({ accountId: creatorProfiles.accountId, id: creatorProfiles.id })
    .from(creatorProfiles)
    .where(eq(creatorProfiles.displayName, FEATURED_DISPLAY_NAME));

  if (!profile) {
    throw new Error(`No creator named "${FEATURED_DISPLAY_NAME}" found.`);
  }

  const objectPath = `${profile.accountId}/avatar/local-featured-fixture.png`;
  const image = await readFile(
    new URL(
      "../public/brand/official/contente-creators-mascot.png",
      import.meta.url,
    ),
  );
  const { error } = await storage
    .from("profile-media")
    .upload(objectPath, image, {
      cacheControl: "3600",
      contentType: "image/png",
      upsert: true,
    });

  if (error) {
    throw error;
  }

  const [asset] = await db.database
    .insert(mediaAssets)
    .values({
      bucketName: "profile-media",
      height: 512,
      kind: "AVATAR",
      mimeType: "image/png",
      objectPath,
      ownerAccountId: profile.accountId,
      sizeBytes: image.byteLength,
      status: "ACTIVE",
      width: 512,
    })
    .returning({ id: mediaAssets.id });

  await db.database
    .update(creatorProfiles)
    .set({ avatarAssetId: asset!.id, featureOrder: 1, isFeatured: true })
    .where(eq(creatorProfiles.id, profile.id));
}

async function clearFixtureCreators(
  db: ReturnType<typeof createDatabaseClient>,
) {
  const pattern = `%@${FIXTURE_EMAIL_DOMAIN}`;
  const fixtureAccounts = sql`(
    select id from public.accounts
    where role = 'INFLUENCER' and operational_email like ${pattern}
  )`;

  await db.database.execute(sql`
    delete from public.sponsorship_placements
    where featured_creator_profile_id in (
      select id from public.creator_profiles
      where account_id in ${fixtureAccounts}
    )
  `);
  await db.database.execute(sql`
    delete from public.creator_metric_snapshots
    where creator_profile_id in (
      select id from public.creator_profiles
      where account_id in ${fixtureAccounts}
    )
  `);
  await db.database.execute(sql`
    delete from public.creator_niches
    where creator_profile_id in (
      select id from public.creator_profiles
      where account_id in ${fixtureAccounts}
    )
  `);
  await db.database.execute(sql`
    update public.creator_profiles set avatar_asset_id = null
    where account_id in ${fixtureAccounts}
  `);
  await db.database.execute(sql`
    delete from public.creator_profiles where account_id in ${fixtureAccounts}
  `);
  await db.database.execute(sql`
    delete from public.social_profiles where owner_account_id in ${fixtureAccounts}
  `);
  await db.database.execute(sql`
    delete from public.media_assets where owner_account_id in ${fixtureAccounts}
  `);
}

async function seedApprovedCreators(
  db: ReturnType<typeof createDatabaseClient>,
  storage: ReturnType<typeof createClient>["storage"],
) {
  const image = await readFile(
    new URL(
      "../public/brand/official/contente-creators-mascot.png",
      import.meta.url,
    ),
  );

  for (const [index, creator] of FIXTURE_CREATORS.entries()) {
    const identityId = crypto.randomUUID();
    const email = `creator-${index}@${FIXTURE_EMAIL_DOMAIN}`;

    await insertIdentity(db, identityId, email);

    const [account] = await db.database
      .insert(accounts)
      .values({
        approvedAt: new Date(),
        authUserId: identityId,
        completionPercentage: 100,
        operationalEmail: email,
        role: "INFLUENCER",
        status: "APPROVED",
      })
      .returning({ id: accounts.id });
    const objectPath = `${account!.id}/avatar/local-showcase-creator.png`;
    const { error } = await storage
      .from("profile-media")
      .upload(objectPath, image, {
        cacheControl: "3600",
        contentType: "image/png",
        upsert: true,
      });

    if (error) {
      throw error;
    }

    const [avatar] = await db.database
      .insert(mediaAssets)
      .values({
        bucketName: "profile-media",
        height: 512,
        kind: "AVATAR",
        mimeType: "image/png",
        objectPath,
        ownerAccountId: account!.id,
        sizeBytes: image.byteLength,
        status: "ACTIVE",
        width: 512,
      })
      .returning({ id: mediaAssets.id });
    const [profile] = await db.database
      .insert(creatorProfiles)
      .values({
        accountId: account!.id,
        avatarAssetId: avatar!.id,
        bio: `Perfil de demonstração de ${creator.name} para o catálogo local.`,
        city: creator.city,
        creatorType: "INFLUENCER",
        displayName: creator.name,
        isCdlMember: creator.cdl,
        isInfluencerJourneyParticipant: creator.journey,
        legalName: `${creator.name} Exemplo`,
        state: creator.state,
        whatsappE164: `+55119${String(88880000 + index)}`,
      })
      .returning({ id: creatorProfiles.id });
    const [social] = await db.database
      .insert(socialProfiles)
      .values({
        handle: `@${creator.handle}`,
        isPrimary: true,
        normalizedUrl: `https://instagram.com/${creator.handle}`,
        ownerAccountId: account!.id,
        platform: "INSTAGRAM",
      })
      .returning({ id: socialProfiles.id });

    await db.database.insert(creatorMetricSnapshots).values({
      creatorProfileId: profile!.id,
      followerCount: 18_000 + index * 7_500,
      interactionCount: 3_200 + index * 410,
      newFollowerCount: 800 + index * 95,
      observedOn: new Date(),
      platform: "INSTAGRAM",
      sharedContentCount: 22 + index * 3,
      socialProfileId: social!.id,
      viewCount: 120_000 + index * 31_000,
    });
  }
}

async function seedApprovedCompanies(
  db: ReturnType<typeof createDatabaseClient>,
) {
  const identities = FIXTURE_COMPANIES.map(() => crypto.randomUUID());

  for (const [index, identityId] of identities.entries()) {
    await insertIdentity(
      db,
      identityId,
      `company-${index}@${FIXTURE_EMAIL_DOMAIN}`,
    );
  }

  const created = await db.database
    .insert(accounts)
    .values(
      identities.map((identityId, index) => ({
        approvedAt: new Date(),
        authUserId: identityId,
        operationalEmail: `company-${index}@${FIXTURE_EMAIL_DOMAIN}`,
        role: "COMPANY" as const,
        status: "APPROVED" as const,
      })),
    )
    .returning({ id: accounts.id });

  await db.database.insert(companyProfiles).values(
    FIXTURE_COMPANIES.map((company, index) => ({
      accountId: created[index]!.id,
      cnpj: company.cnpj,
      // Alternate the self-declared badges so the marquee/catalog show every
      // combination (none, CDL, Jornada, both).
      isCdlMember: index % 2 === 0,
      isInfluencerJourneyParticipant: index % 3 === 0,
      legalName: `${company.tradeName} LTDA`,
      segment: company.segment,
      tradeName: company.tradeName,
    })),
  );
}

async function main() {
  const environment = assertLocalEnvironment();
  const db = createDatabaseClient(
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  );

  try {
    await clearFixtures(db);

    if (process.argv.includes("--clear")) {
      process.stdout.write("Landing showcase fixtures removed.\n");

      return;
    }

    const storage = createClient(
      environment.NEXT_PUBLIC_SUPABASE_URL,
      environment.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } },
    ).storage;

    await seedFeaturedCreator(db, storage);
    await seedApprovedCompanies(db);
    await seedApprovedCreators(db, storage);

    process.stdout.write(
      `Landing showcase ready: "${FEATURED_DISPLAY_NAME}" featured with a photo, ` +
        `${FIXTURE_COMPANIES.length} extra approved companies in the marquee and ` +
        `${FIXTURE_CREATORS.length} extra approved creators with Instagram metrics.\n`,
    );
  } finally {
    await db.client.end({ timeout: 2 });
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
});

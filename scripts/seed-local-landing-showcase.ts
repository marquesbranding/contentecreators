import "server-only";

import { readFile } from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";
import { eq, sql } from "drizzle-orm";

import { createDatabaseClient } from "@/db/client";
import {
  accounts,
  companyProfiles,
  creatorProfiles,
  mediaAssets,
} from "@/db/schema";
import { parseServerEnv } from "@/shared/lib/env/server-env-schema";

/**
 * Local-only fixture for the public landing's "Creators e marcas em destaque"
 * section. The base seed approves a single company and no curated creator, so
 * the marquee repeats one name and every card falls back to initials — which
 * reads as hardcoded even though both lists are queried from approved
 * accounts. This adds enough approved rows to see the real behaviour:
 *
 * - one seeded creator promoted to `is_featured` with an active avatar, so the
 *   card renders a signed photo while uncurated creators keep their initials;
 * - several approved companies, so the marquee actually rotates names.
 *
 * There is no backoffice control for `is_featured` yet, so that flag cannot be
 * reached through the product at all.
 *
 * Usage:
 *   npm run local:showcase
 *   npm run local:showcase -- --clear
 */
const FEATURED_DISPLAY_NAME = "Gabi Conecta";
const FIXTURE_EMAIL_DOMAIN = "showcase.local.test";
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

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

    process.stdout.write(
      `Landing showcase ready: "${FEATURED_DISPLAY_NAME}" featured with a photo, ` +
        `${FIXTURE_COMPANIES.length} extra approved companies in the marquee.\n`,
    );
  } finally {
    await db.client.end({ timeout: 2 });
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
});

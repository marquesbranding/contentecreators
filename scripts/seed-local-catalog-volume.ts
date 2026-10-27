import "server-only";

import { sql } from "drizzle-orm";

import { createDatabaseClient } from "@/db/client";
import {
  accounts,
  companyProfiles,
  creatorMetricSnapshots,
  creatorNiches,
  creatorProfiles,
  socialProfiles,
} from "@/db/schema";
import { parseServerEnv } from "@/shared/lib/env/server-env-schema";

/**
 * Local-only volume fixture for testing catalog search and filters: many
 * approved creators and companies spread over cities, niches, platforms,
 * follower ranges and the CDL / Jornada badges. Every identity signs in with
 * `LocalTest123!`.
 *
 * Usage:
 *   npm run local:catalog-volume
 *   npm run local:catalog-volume -- --count=60
 *   npm run local:catalog-volume -- --clear
 */
const EMAIL_DOMAIN = "volume.local.test";
const PASSWORD = "LocalTest123!";
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

const CITIES = [
  ["São Paulo", "SP"],
  ["Rio de Janeiro", "RJ"],
  ["Belo Horizonte", "MG"],
  ["Curitiba", "PR"],
  ["Porto Alegre", "RS"],
  ["Recife", "PE"],
  ["Salvador", "BA"],
  ["Fortaleza", "CE"],
  ["Florianópolis", "SC"],
  ["Goiânia", "GO"],
] as const;
const FIRST_NAMES = [
  "Ana",
  "Bruno",
  "Camila",
  "Diego",
  "Elisa",
  "Felipe",
  "Gabriela",
  "Hugo",
  "Isadora",
  "João",
  "Karina",
  "Lucas",
  "Mariana",
  "Nicolas",
  "Olívia",
  "Paulo",
  "Rafaela",
  "Samuel",
  "Tainá",
  "Vitor",
] as const;
const LAST_NAMES = [
  "Alves",
  "Barros",
  "Campos",
  "Duarte",
  "Esteves",
  "Farias",
  "Guedes",
  "Horta",
  "Ibiapina",
  "Junqueira",
] as const;
const COMPANY_WORDS = [
  "Aurora",
  "Brisa",
  "Cobalto",
  "Dunas",
  "Eclipse",
  "Floresta",
  "Granito",
  "Horizonte",
  "Ipê",
  "Jasmim",
  "Kairós",
  "Lume",
  "Maré",
  "Nimbus",
  "Oásis",
] as const;
const COMPANY_KINDS = [
  "Studio",
  "Café",
  "Fitness",
  "Moda",
  "Tech",
  "Cosméticos",
  "Viagens",
  "Pet",
  "Decor",
  "Foods",
] as const;
const SEGMENTS = [
  "Moda",
  "Alimentação",
  "Tecnologia",
  "Beleza",
  "Turismo",
  "Saúde",
  "Pets",
  "Casa e decoração",
  "Esportes",
  "Educação",
] as const;
const PLATFORMS = ["INSTAGRAM", "TIKTOK", "YOUTUBE"] as const;

function assertLocalEnvironment() {
  const environment = parseServerEnv(process.env);
  const supabaseUrl = new URL(environment.NEXT_PUBLIC_SUPABASE_URL);

  if (
    environment.APP_ENV !== "local" ||
    !LOCAL_HOSTS.has(supabaseUrl.hostname)
  ) {
    throw new Error("This fixture only runs against a local Supabase.");
  }
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

type Db = ReturnType<typeof createDatabaseClient>;

async function insertIdentity(db: Db, identityId: string, email: string) {
  await db.database.execute(sql`
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    )
    values (
      '00000000-0000-0000-0000-000000000000', ${identityId}, 'authenticated',
      'authenticated', ${email},
      extensions.crypt(${PASSWORD}, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"fixture":true}'::jsonb, now(), now(), '', '', '', ''
    )
  `);
  // GoTrue only signs an email user in when it has a matching identity row.
  await db.database.execute(sql`
    insert into auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at,
      created_at, updated_at
    )
    values (
      ${identityId}, ${identityId},
      jsonb_build_object(
        'sub', ${identityId}::text, 'email', ${email}::text,
        'email_verified', true, 'phone_verified', false
      ),
      'email', now(), now(), now()
    )
  `);
}

async function clear(db: Db) {
  const pattern = `%@${EMAIL_DOMAIN}`;
  const owned = sql`(select id from public.accounts where operational_email like ${pattern})`;
  const profiles = sql`(select id from public.creator_profiles where account_id in ${owned})`;

  await db.database.execute(
    sql`delete from public.sponsorship_placements where featured_creator_profile_id in ${profiles}`,
  );
  await db.database.execute(
    sql`delete from public.creator_metric_snapshots where creator_profile_id in ${profiles}`,
  );
  await db.database.execute(
    sql`delete from public.creator_niches where creator_profile_id in ${profiles}`,
  );
  await db.database.execute(
    sql`delete from public.creator_profiles where account_id in ${owned}`,
  );
  await db.database.execute(
    sql`delete from public.social_profiles where owner_account_id in ${owned}`,
  );
  await db.database.execute(
    sql`delete from public.company_profiles where account_id in ${owned}`,
  );
  await db.database.execute(
    sql`delete from public.accounts where operational_email like ${pattern}`,
  );
  await db.database.execute(
    sql`delete from auth.users where email like ${pattern}`,
  );
}

async function seedCreators(db: Db, count: number) {
  const nicheRows = await db.database.execute<{ id: string }>(
    sql`select id from public.niches where is_active order by sort_order`,
  );
  const nicheIds = [...nicheRows].map((row) => row.id);

  for (let index = 0; index < count; index += 1) {
    const first = FIRST_NAMES[index % FIRST_NAMES.length]!;
    const last =
      LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length]!;
    const name = `${first} ${last}`;
    const [city, state] = CITIES[index % CITIES.length]!;
    const platform = PLATFORMS[index % 5 === 0 ? 1 : index % 7 === 0 ? 2 : 0]!;
    const handle = `${slugify(name)}_${index}`;
    const email = `influencer-${index}@${EMAIL_DOMAIN}`;
    const identityId = crypto.randomUUID();

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
    const [profile] = await db.database
      .insert(creatorProfiles)
      .values({
        accountId: account!.id,
        bio: `Perfil de volume de ${name} (${city}/${state}) para testar busca e filtros.`,
        city,
        creatorType: index % 6 === 0 ? "UGC" : "INFLUENCER",
        displayName: name,
        isCdlMember: index % 3 === 0,
        isInfluencerJourneyParticipant: index % 4 === 0,
        legalName: `${name} Exemplo`,
        state,
        whatsappE164: `+55119${String(70000000 + index)}`,
      })
      .returning({ id: creatorProfiles.id });
    const [social] = await db.database
      .insert(socialProfiles)
      .values({
        handle: `@${handle}`,
        isPrimary: true,
        normalizedUrl: `https://${platform.toLowerCase()}.com/${handle}`,
        ownerAccountId: account!.id,
        platform,
      })
      .returning({ id: socialProfiles.id });

    // Instagram carries the extended metrics; other networks only a count.
    const followers = 1_500 + ((index * 7_919) % 480_000);

    await db.database.insert(creatorMetricSnapshots).values({
      creatorProfileId: profile!.id,
      followerCount: followers,
      observedOn: new Date(),
      platform,
      socialProfileId: social!.id,
      ...(platform === "INSTAGRAM"
        ? {
            interactionCount: Math.round(followers * 0.06),
            newFollowerCount: Math.round(followers * 0.01),
            sharedContentCount: 10 + (index % 30),
            viewCount: followers * 4,
          }
        : {}),
    });

    if (nicheIds.length > 0) {
      const picks = new Set([
        nicheIds[index % nicheIds.length]!,
        nicheIds[(index * 3 + 1) % nicheIds.length]!,
      ]);

      await db.database.insert(creatorNiches).values(
        [...picks].map((nicheId) => ({
          creatorProfileId: profile!.id,
          nicheId,
        })),
      );
    }
  }
}

async function seedCompanies(db: Db, count: number) {
  for (let index = 0; index < count; index += 1) {
    const tradeName = `${COMPANY_WORDS[index % COMPANY_WORDS.length]} ${
      COMPANY_KINDS[
        Math.floor(index / COMPANY_WORDS.length) % COMPANY_KINDS.length
      ]
    }`;
    const email = `empresa-${index}@${EMAIL_DOMAIN}`;
    const identityId = crypto.randomUUID();

    await insertIdentity(db, identityId, email);

    const [account] = await db.database
      .insert(accounts)
      .values({
        approvedAt: new Date(),
        authUserId: identityId,
        completionPercentage: 100,
        operationalEmail: email,
        role: "COMPANY",
        status: "APPROVED",
      })
      .returning({ id: accounts.id });

    await db.database.insert(companyProfiles).values({
      accountId: account!.id,
      cnpj: String(91_000_000_000_000 + index),
      isCdlMember: index % 2 === 0,
      isInfluencerJourneyParticipant: index % 3 === 0,
      legalName: `${tradeName} LTDA`,
      segment: SEGMENTS[index % SEGMENTS.length]!,
      tradeName,
    });
  }
}

async function main() {
  assertLocalEnvironment();

  const db = createDatabaseClient(
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  );
  const countArg = process.argv.find((arg) => arg.startsWith("--count="));
  const count = countArg ? Number(countArg.split("=")[1]) : 40;

  try {
    await clear(db);

    if (process.argv.includes("--clear")) {
      process.stdout.write("Catalog volume fixtures removed.\n");

      return;
    }

    await seedCreators(db, count);
    await seedCompanies(db, Math.ceil(count * 0.75));
    process.stdout.write(
      `Catalog volume ready: ${count} approved creators (influencer-N@${EMAIL_DOMAIN}) ` +
        `and ${Math.ceil(count * 0.75)} approved companies (empresa-N@${EMAIL_DOMAIN}).\n`,
    );
  } finally {
    await db.client.end({ timeout: 2 });
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
});

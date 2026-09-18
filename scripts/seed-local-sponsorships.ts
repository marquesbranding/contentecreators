import "server-only";

import { readFile } from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";
import { eq, sql } from "drizzle-orm";

import { createDatabaseClient } from "@/db/client";
import { accounts, mediaAssets, sponsorshipPlacements } from "@/db/schema";
import { parseServerEnv } from "@/shared/lib/env/server-env-schema";

/**
 * Local-only fixtures that fill the "catalog-carousel" slot with several
 * appearance variants (image only, text only, no button, link-on-creative,
 * custom button color, custom font), so the real catalog page has more than
 * the single top-banner example from supabase/seed.sql to review.
 *
 * Media assets must be owned by an ADMIN account -- isMediaEligible() in
 * sponsorship-placement-policy.ts checks media.ownerAccountRole === "ADMIN",
 * so uploads owned by a company account never render on the real page even
 * when the placement itself is active.
 *
 * Usage:
 *   npm run local:sponsorships
 *   npm run local:sponsorships -- --clear
 */
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);
const ADMIN_OWNER_ACCOUNT_ID = "a0000000-0000-4000-8000-000000000001";
const ADVERTISER_ACCOUNT_ID = "c0000000-0000-4000-8000-000000000004";
const ADVERTISER_LABEL = "Empresa Quatro";
const TITLE_PREFIX = "[local-fixture] ";

interface SponsorshipFixture {
  slotKey: "catalog-carousel" | "catalog-inline";
  imageFile: string;
  title: string | null;
  body: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  linkOnCreative: boolean;
  buttonBackgroundColor: string | null;
  buttonTextColor: string | null;
  textColor: string | null;
  fontFamily: string | null;
  showAdvertiserLabel?: boolean;
}

const FIXTURES: SponsorshipFixture[] = [
  {
    body: "Imagem, título, corpo e botão azul com fonte padrão.",
    buttonBackgroundColor: "#2563EB",
    buttonTextColor: "#FFFFFF",
    fontFamily: "default",
    imageFile: "full.png",
    linkLabel: "Ver oferta",
    linkOnCreative: false,
    linkUrl: "https://contentecreators.com.br/completo",
    slotKey: "catalog-carousel",
    textColor: null,
    title: "Combo completo",
  },
  {
    body: null,
    buttonBackgroundColor: null,
    buttonTextColor: null,
    fontFamily: null,
    imageFile: "image-only.png",
    linkLabel: null,
    linkOnCreative: false,
    linkUrl: null,
    slotKey: "catalog-carousel",
    textColor: null,
    title: null,
  },
  {
    body: "Badge \"Conteúdo patrocinado\" continua visível; só o selo do anunciante some.",
    buttonBackgroundColor: null,
    buttonTextColor: null,
    fontFamily: null,
    imageFile: "no-badge.png",
    linkLabel: "Saiba mais",
    linkOnCreative: false,
    linkUrl: "https://contentecreators.com.br/sem-selo",
    showAdvertiserLabel: false,
    slotKey: "catalog-carousel",
    textColor: null,
    title: "Sem selo do anunciante",
  },
  {
    body: "Card informativo, sem botão nem link clicável.",
    buttonBackgroundColor: null,
    buttonTextColor: null,
    fontFamily: null,
    imageFile: "no-button.png",
    linkLabel: null,
    linkOnCreative: false,
    linkUrl: null,
    slotKey: "catalog-carousel",
    textColor: null,
    title: "Sem botão nem link",
  },
  {
    body: "Sem botão visível — o card inteiro é clicável.",
    buttonBackgroundColor: null,
    buttonTextColor: null,
    fontFamily: null,
    imageFile: "on-creative-link.png",
    linkLabel: null,
    linkOnCreative: true,
    linkUrl: "https://contentecreators.com.br/link-na-imagem",
    slotKey: "catalog-carousel",
    textColor: null,
    title: "Link na imagem inteira",
  },
  {
    body: "Testando cor de fundo e texto do botão.",
    buttonBackgroundColor: "#84CC16",
    buttonTextColor: "#111111",
    fontFamily: null,
    imageFile: "green-button.png",
    linkLabel: "Comprar agora",
    linkOnCreative: false,
    linkUrl: "https://contentecreators.com.br/botao-verde",
    slotKey: "catalog-carousel",
    textColor: null,
    title: "Botão com cor customizada",
  },
  {
    body: "fontFamily definido como serif, com cor de texto roxa.",
    buttonBackgroundColor: null,
    buttonTextColor: null,
    fontFamily: "serif",
    imageFile: "serif-font.png",
    linkLabel: "Ver mais",
    linkOnCreative: false,
    linkUrl: "https://contentecreators.com.br/fonte-serif",
    slotKey: "catalog-carousel",
    textColor: "#7C3AED",
    title: "Fonte serifada",
  },
  {
    body: "Barra lateral fixa no desktop, acima da listagem no celular.",
    buttonBackgroundColor: null,
    buttonTextColor: null,
    fontFamily: null,
    imageFile: "full.png",
    linkLabel: "Saiba mais",
    linkOnCreative: false,
    linkUrl: "https://contentecreators.com.br",
    slotKey: "catalog-inline",
    textColor: null,
    title: "Anuncie na lateral do catálogo",
  },
];

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

async function clearFixtures(db: ReturnType<typeof createDatabaseClient>) {
  await db.database.execute(sql`
    delete from public.sponsorship_placements
    where title like ${`${TITLE_PREFIX}%`}
       or (title is null and body like '%não usa nenhuma imagem%')
       or (title is null and slot_key = 'catalog-carousel' and advertiser_label = ${ADVERTISER_LABEL})
  `);
  await db.database.execute(sql`
    delete from public.media_assets
    where object_path like ${`${ADMIN_OWNER_ACCOUNT_ID}/sponsorship/local-variant-%`}
       or object_path like ${`${ADVERTISER_ACCOUNT_ID}/sponsorship/local-fixture-%`}
  `);
}

async function main() {
  const environment = assertLocalEnvironment();
  const db = createDatabaseClient(
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  );

  try {
    await clearFixtures(db);

    if (process.argv.includes("--clear")) {
      process.stdout.write("Sponsorship fixtures removed.\n");

      return;
    }

    const [advertiser] = await db.database
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.id, ADVERTISER_ACCOUNT_ID));

    if (!advertiser) {
      throw new Error(
        "Expected approved company fixture from supabase/seed.sql to exist.",
      );
    }

    const storage = createClient(
      environment.NEXT_PUBLIC_SUPABASE_URL,
      environment.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } },
    ).storage;

    let sortOrder = 30;

    for (const [index, fixture] of FIXTURES.entries()) {
      let creativeAssetId: string | null = null;

      if (fixture.imageFile) {
        const image = await readFile(
          new URL(
            `../supabase/fixtures/sponsorship-variants/${fixture.imageFile}`,
            import.meta.url,
          ),
        );
        const objectPath = `${ADMIN_OWNER_ACCOUNT_ID}/sponsorship/local-variant-${index}-${fixture.imageFile}`;
        const { error } = await storage
          .from("sponsorship-media")
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
            bucketName: "sponsorship-media",
            height: 800,
            kind: "SPONSORSHIP_CREATIVE",
            mimeType: "image/png",
            objectPath,
            ownerAccountId: ADMIN_OWNER_ACCOUNT_ID,
            sizeBytes: image.byteLength,
            status: "ACTIVE",
            width: 1600,
          })
          .returning({ id: mediaAssets.id });

        creativeAssetId = asset!.id;
      }

      await db.database.insert(sponsorshipPlacements).values({
        advertiserAccountId: advertiser.id,
        advertiserLabel: ADVERTISER_LABEL,
        audience: "ALL",
        body: fixture.body,
        buttonBackgroundColor: fixture.buttonBackgroundColor,
        buttonTextColor: fixture.buttonTextColor,
        creativeAssetId,
        endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        fontFamily: fixture.fontFamily as never,
        isActive: true,
        linkLabel: fixture.linkLabel,
        linkOnCreative: fixture.linkOnCreative,
        linkUrl: fixture.linkUrl,
        placementType: fixture.slotKey === "catalog-inline" ? "INLINE_BANNER" : "CAROUSEL",
        showAdvertiserLabel: fixture.showAdvertiserLabel ?? true,
        showSponsoredBadge: true,
        slotKey: fixture.slotKey,
        sortOrder: sortOrder++,
        startsAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        textColor: fixture.textColor,
        title: fixture.title ? `${TITLE_PREFIX}${fixture.title}` : fixture.title,
      });
    }

    process.stdout.write(
      `Sponsorship fixtures ready: ${FIXTURES.length} active placements added.\n`,
    );
  } finally {
    await db.client.end({ timeout: 2 });
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
});

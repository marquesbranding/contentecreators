import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

import {
  acceptanceEmail,
  cleanupAcceptanceIdentity,
  seedAcceptanceAccount,
  signInAcceptanceUser,
} from "../support/local-acceptance";

const DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const SEEDED_PLACEMENT_ID = "f6000000-0000-4000-8000-000000000003";
const SEEDED_TITLE = "Sua marca em destaque aqui";
const evidenceDirectory = join(
  process.cwd(),
  "evidencias-reaceite-e-patrocinios",
);
const CREATIVE_OBJECT_PATH =
  "a0000000-0000-4000-8000-000000000001/sponsorship/72000000-0000-4000-8000-000000000010.png";

/**
 * The seeded creative is ACTIVE in the database, but its file is absent from
 * local Storage after other acceptance cleanups, so the placement is not
 * delivered. Re-upload the placeholder before each run (upsert).
 */
async function ensureSeededCreativeObject() {
  // The local stack's own keys, as reported by the Supabase CLI.
  const status = execFileSync(
    "supabase",
    ["status", "-o", "env", "--workdir", "."],
    { encoding: "utf8" },
  );
  const read = (name: string) =>
    new RegExp(`^${name}="?([^"\\n]*)"?$`, "mu").exec(status)?.[1] ?? "";
  const response = await fetch(
    `${read("API_URL")}/storage/v1/object/sponsorship-media/${CREATIVE_OBJECT_PATH}`,
    {
      body: readFileSync(
        join(process.cwd(), "public/brand/contente-creators-logo.png"),
      ),
      headers: {
        Authorization: `Bearer ${read("SERVICE_ROLE_KEY")}`,
        "Content-Type": "image/png",
        "x-upsert": "true",
      },
      method: "POST",
    },
  );
  expect(response.status).toBe(200);
}

test("public catalog shows the seeded sponsorship title only when show_title is on", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "Public visibility is viewport-independent; desktop captures the evidence.",
  );
  test.setTimeout(120000);
  mkdirSync(evidenceDirectory, { recursive: true });
  await ensureSeededCreativeObject();
  const email = acceptanceEmail("public-text-visibility");
  await seedAcceptanceAccount({
    email,
    role: "INFLUENCER",
    status: "APPROVED",
  });
  const database = postgres(DATABASE_URL, { connect_timeout: 5, max: 1 });

  try {
    await database`
      update public.sponsorship_placements
      set show_title = false, show_body = false
      where id = ${SEEDED_PLACEMENT_ID}::uuid
    `;
    await signInAcceptanceUser(page, { email, nextPath: "/app/catalog" });
    await expect(page.getByText(SEEDED_TITLE, { exact: true })).toHaveCount(0);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(SEEDED_TITLE, { exact: true })).toHaveCount(0);
    await page.screenshot({
      path: join(evidenceDirectory, "10-patrocinio-publico-sem-titulo.png"),
    });

    await database`
      update public.sponsorship_placements
      set show_title = true
      where id = ${SEEDED_PLACEMENT_ID}::uuid
    `;
    await page.reload();
    await expect(
      page.getByText(SEEDED_TITLE, { exact: true }).first(),
    ).toBeVisible();
    await page.screenshot({
      path: join(evidenceDirectory, "11-patrocinio-publico-com-titulo.png"),
    });
  } finally {
    await database`
      update public.sponsorship_placements
      set show_title = true, show_body = true
      where id = ${SEEDED_PLACEMENT_ID}::uuid
    `;
    await database.end();
    await cleanupAcceptanceIdentity(email);
  }
});

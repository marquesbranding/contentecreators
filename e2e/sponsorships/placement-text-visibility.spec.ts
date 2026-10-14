import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

import {
  acceptanceEmail,
  cleanupAcceptanceIdentity,
  seedAcceptanceAccount,
  signInAcceptanceUser,
} from "../support/local-acceptance";

const DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const evidenceDirectory = join(
  process.cwd(),
  "evidencias-reaceite-e-patrocinios",
);

async function openNewPlacementDialog(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Novo patrocínio" });
  // The trigger is server-rendered, so a click can land before hydration.
  await expect(async () => {
    await page.getByRole("button", { name: "Novo patrocínio" }).click();
    await expect(dialog).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30000 });
  return dialog;
}

test("title and text reach the creative only when their visibility toggles are checked", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "The visibility rules are viewport-independent; desktop covers the form.",
  );
  test.setTimeout(120000);
  mkdirSync(evidenceDirectory, { recursive: true });
  const email = acceptanceEmail("text-visibility");
  const title = "Campanha interna de teste";
  const body = "Texto interno de apoio";
  await seedAcceptanceAccount({ email, role: "ADMIN" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const database = postgres(DATABASE_URL, { connect_timeout: 5, max: 1 });

  try {
    await signInAcceptanceUser(page, {
      backoffice: true,
      email,
      nextPath: "/backoffice/sponsorships",
    });
    const dialog = await openNewPlacementDialog(page);
    await dialog
      .getByText("Banner no topo do catálogo", { exact: true })
      .click();
    await dialog.getByRole("button", { name: "Continuar" }).click();

    const titleToggle = dialog.getByRole("checkbox", {
      name: "Exibir título na arte",
    });
    const bodyToggle = dialog.getByRole("checkbox", {
      name: "Exibir texto na arte",
    });
    await expect(titleToggle).toHaveAttribute("aria-disabled", "true");
    await expect(bodyToggle).toHaveAttribute("aria-disabled", "true");

    await dialog.getByLabel("Título (opcional)", { exact: true }).fill(title);
    await expect(titleToggle).not.toHaveAttribute("aria-disabled", "true");
    await dialog.getByLabel("Texto (opcional)", { exact: true }).fill(body);
    await expect(bodyToggle).not.toHaveAttribute("aria-disabled", "true");

    // Saved but hidden: the live preview must not show either copy.
    const preview = page.frameLocator(
      'iframe[title="Prévia do patrocínio no site"]',
    );
    await expect(preview.getByText(title, { exact: true })).toHaveCount(0);
    await expect(preview.getByText(body, { exact: true })).toHaveCount(0);
    await page.screenshot({
      path: join(
        evidenceDirectory,
        "06-patrocinio-form-checkbox-desabilitado.png",
      ),
    });

    await page.screenshot({
      path: join(
        evidenceDirectory,
        "07-patrocinio-form-titulo-oculto-previa.png",
      ),
    });
    await titleToggle.click();
    await expect(preview.getByText(title, { exact: true })).toBeVisible();
    await expect(preview.getByText(body, { exact: true })).toHaveCount(0);
    await page.screenshot({
      path: join(
        evidenceDirectory,
        "08-patrocinio-form-titulo-exibido-previa.png",
      ),
    });

    // Clearing the title must uncheck and disable its toggle again.
    await dialog.getByLabel("Título (opcional)", { exact: true }).fill("");
    await expect(titleToggle).toHaveAttribute("aria-checked", "false");
    await expect(titleToggle).toHaveAttribute("aria-disabled", "true");
    await dialog.getByLabel("Título (opcional)", { exact: true }).fill(title);
    await titleToggle.click();

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/backoffice/sponsorships") &&
        response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Salvar rascunho" }).click();
    const response = await responsePromise;
    expect(response.status(), await response.text()).toBe(201);
    const result = await response.json();
    const placementId = result.placement.id as string;

    try {
      // Wait for the close animation to finish so no leftover dialog is captured.
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(
        page.getByText(title, { exact: true }).first(),
      ).toBeVisible();
      await expect(
        page.getByText("Texto oculto na arte").first(),
      ).toBeVisible();
      await page.screenshot({
        path: join(
          evidenceDirectory,
          "09-listagem-backoffice-badge-oculto.png",
        ),
      });

      const [{ show_title, show_body }] = await database<
        { show_body: boolean; show_title: boolean }[]
      >`
        select show_title, show_body
        from public.sponsorship_placements
        where id = ${placementId}::uuid
      `;
      expect(show_title).toBe(true);
      expect(show_body).toBe(false);
    } finally {
      await database`delete from public.sponsorship_placements where id = ${placementId}::uuid`;
    }
    expect(errors).toEqual([]);
  } finally {
    await database.end();
    await cleanupAcceptanceIdentity(email);
  }
});

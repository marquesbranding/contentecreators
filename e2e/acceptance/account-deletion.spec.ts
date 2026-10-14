import { expect, test, type Page, type TestInfo } from "@playwright/test";

import {
  acceptanceEmail,
  cleanupAcceptanceIdentity,
  readAcceptanceAccount,
  readAcceptanceDeletion,
  readAcceptanceOutbox,
  resetLocalRegistrationRateLimits,
  seedAcceptanceAccount,
  signInAcceptanceUser,
} from "../support/local-acceptance";

/** The consent banner covers the bottom of the page; decline it (privacy-preserving). */
async function declineCookies(page: Page) {
  const decline = page.getByRole("button", { name: "Recusar", exact: true });

  if (await decline.isVisible().catch(() => false)) {
    await decline.click();
  }
}

function runOnce(testInfo: TestInfo) {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "Database-backed deletion journey runs once in Chromium.",
  );
}

test.describe("immediate account deletion", () => {
  test("deletes an approved creator at once and lets the same login register again", async ({
    page,
  }, testInfo) => {
    runOnce(testInfo);
    test.setTimeout(180_000);
    const email = acceptanceEmail("deleted-creator");
    let deletedAccountId: string | undefined;

    try {
      await resetLocalRegistrationRateLimits();
      const fixture = await seedAcceptanceAccount({ email });
      deletedAccountId = fixture.accountId;

      await signInAcceptanceUser(page, { email, nextPath: "/app/profile" });
      await declineCookies(page);
      await expect(
        page.getByText(/Exclui seu perfil, fotos e dados agora/u),
      ).toBeVisible();
      await expect(page.locator("body")).not.toContainText(/30 dias/u);

      const dialog = page.getByRole("dialog", { name: "Excluir minha conta" });
      // The trigger only responds once the client bundle has hydrated.
      await expect(async () => {
        await page
          .getByRole("button", { name: "Excluir minha conta" })
          .first()
          .click();
        await expect(dialog).toBeVisible({ timeout: 2_000 });
      }).toPass({ timeout: 60_000 });
      await dialog.getByLabel(/Digite EXCLUIR para confirmar/u).fill("EXCLUIR");
      await dialog
        .getByRole("checkbox", { name: /não podem ser recuperados/u })
        .check();
      await dialog.getByRole("button", { name: "Excluir minha conta" }).click();

      await expect(page).toHaveURL(/\/conta-excluida$/u, { timeout: 30_000 });
      await expect(
        page.getByRole("heading", { name: "Sua conta foi excluída" }),
      ).toBeVisible();

      // Signed out everywhere: the product area asks for a login again.
      await page.goto("/app/profile");
      await expect(page).toHaveURL(/\/login/u);

      await expect
        .poll(async () => readAcceptanceDeletion(fixture.accountId))
        .toMatchObject({
          authUserId: null,
          deletionState: "ELIMINATED",
          fullName: null,
          profiles: 0,
        });
      const outbox = await readAcceptanceOutbox(fixture.accountId);
      expect(
        outbox.some((item) => item.template === "ACCOUNT_DELETION_REQUESTED"),
      ).toBe(true);

      // Same login again: the Auth user was kept and is not banned, and the
      // registration starts from role selection with nothing from before.
      await signInAcceptanceUser(page, {
        email,
        nextPath: "/onboarding/account",
      });
      await expect(
        page.getByRole("heading", { name: "Complete sua conta" }),
      ).toBeVisible();
      await expect(
        page.getByLabel("Nome completo", { exact: true }),
      ).toHaveValue("");

      await page
        .getByLabel("Nome completo", { exact: true })
        .fill("Recadastro Empresa");
      await page
        .getByRole("radio", { name: "Sou empresa", exact: true })
        .check();
      await page.getByLabel("WhatsApp com DDD").fill("11988887777");
      await declineCookies(page);
      await page
        .getByRole("button", { name: "Continuar para o perfil" })
        .click();
      await expect(page).toHaveURL(/\/onboarding\/company$/u);

      const reRegistered = await readAcceptanceAccount(email);
      expect(reRegistered).toMatchObject({ role: "COMPANY" });
      expect(reRegistered?.id).not.toBe(fixture.accountId);
    } finally {
      await cleanupAcceptanceIdentity(email, {
        deletedAccountIds: deletedAccountId ? [deletedAccountId] : [],
      });
    }
  });
});

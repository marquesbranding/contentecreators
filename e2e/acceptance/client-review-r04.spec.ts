import { expect, test, type Page, type TestInfo } from "@playwright/test";

import {
  acceptanceEmail,
  cleanupAcceptanceIdentity,
  confirmOnboardingSubmission,
  readAcceptanceAccount,
  readAcceptanceCreatorProfileId,
  removeAcceptanceSponsorships,
  resetLocalRegistrationRateLimits,
  seedAcceptanceAccount,
  seedAcceptanceSponsorships,
  seedRolelessAcceptanceIdentity,
  signInAcceptanceUser,
} from "../support/local-acceptance";

const COMPANY_EMAIL = "company-approved@contentecreators.test";
const JOURNEY_ALT = "Jornada do Influenciador";

function runOnce(testInfo: TestInfo) {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "Database-backed review R04 journeys run once in Chromium.",
  );
}

/** The consent banner covers the bottom of the page; decline it. */
async function declineCookies(page: Page) {
  const decline = page.getByRole("button", { name: "Recusar", exact: true });

  if (await decline.isVisible().catch(() => false)) {
    await decline.click();
  }
}

async function signInAsCompany(page: Page, nextPath: string) {
  await signInAcceptanceUser(page, { email: COMPANY_EMAIL, nextPath });
  await declineCookies(page);
}

test.describe("client review R04", () => {
  // Sponsorship fixtures share the "[e2e-r04]" prefix, so run one at a time.
  test.describe.configure({ mode: "serial" });

  test("registers a creator with Instagram metrics and the Jornada badge, then shows both on the public detail after approval", async ({
    page,
  }, testInfo) => {
    runOnce(testInfo);
    test.setTimeout(180_000);
    const email = acceptanceEmail("r04-creator");
    const adminEmail = acceptanceEmail("r04-admin");
    const displayName = `Creator R04 ${crypto.randomUUID().slice(0, 6)}`;

    try {
      await resetLocalRegistrationRateLimits();
      await seedAcceptanceAccount({ email: adminEmail, role: "ADMIN" });
      await seedRolelessAcceptanceIdentity(email);

      await signInAcceptanceUser(page, {
        email,
        nextPath: "/onboarding/account",
      });
      await declineCookies(page);
      await page.getByLabel("Nome completo", { exact: true }).fill(displayName);
      await page.getByRole("radio", { name: "Sou influencer" }).check();
      await page.getByLabel("WhatsApp com DDD").fill("11999999999");
      await page
        .getByRole("button", { name: "Continuar para o perfil" })
        .click();
      await expect(page).toHaveURL(/\/onboarding\/influencer$/u);

      await page
        .getByLabel("Conte sobre seu conteúdo")
        .fill("Crio conteúdo sobre viagens e tecnologia para marcas locais.");
      const journey = page.getByRole("checkbox", {
        name: /Eu fiz a Jornada do Influenciador/u,
      });
      await journey.check();
      await expect(
        page.getByRole("link", { name: /jornadadoinfluenciador/iu }).first(),
      ).toHaveAttribute("rel", /noopener/u);
      await page
        .getByRole("button", { name: "Continuar", exact: true })
        .click();
      await expect(page).toHaveURL(/step=audience/u);

      await page
        .getByRole("checkbox", { name: "Instagram", exact: true })
        .check();
      await page
        .getByLabel("Link do perfil no Instagram", { exact: true })
        .fill("https://instagram.com/creator_r04");
      await page
        .getByLabel("Seguidores no Instagram", { exact: true })
        .fill("15000");
      await page.getByLabel("Visualizações", { exact: true }).fill("50000");
      await page.getByLabel("Interações", { exact: true }).fill("3200");
      await page.getByLabel("Novos seguidores", { exact: true }).fill("800");
      const sharedContent = page.getByLabel("Conteúdo que você compartilhou", {
        exact: true,
      });
      await expect(sharedContent).toHaveAttribute("type", "number");
      await sharedContent.fill("22");
      await page
        .getByLabel("Principais nichos", { exact: true })
        .fill("Tecnologia");
      await page
        .getByRole("option", {
          name: "Tecnologia, games e inovação",
          exact: true,
        })
        .click();
      await page.keyboard.press("Escape");
      await page
        .getByRole("button", { name: "Continuar", exact: true })
        .click();
      await expect(page).toHaveURL(/step=location/u);

      await page.getByLabel("Cidade", { exact: true }).fill("São Paulo");
      await page.getByLabel("UF", { exact: true }).click();
      await page.getByRole("option", { name: "SP", exact: true }).click();
      await page
        .getByRole("checkbox", { name: /Li e aceito os Termos/u })
        .check();
      await page
        .getByRole("checkbox", { name: /Li e aceito a Política/u })
        .check();
      await confirmOnboardingSubmission(page);
      await expect(page).toHaveURL(/\/app\/status\/analysis$/u, {
        timeout: 20_000,
      });

      const account = await readAcceptanceAccount(email);
      expect(account?.status).toBe("PENDING_REVIEW");

      // Backoffice: the review shows the self-declaration; approve.
      await page.context().clearCookies();
      await signInAcceptanceUser(page, {
        backoffice: true,
        email: adminEmail,
        nextPath: `/backoffice/moderation/${account!.id}`,
        password: "LocalTest123!",
      });
      await expect(
        page
          .locator("dt", { hasText: "Jornada do Influenciador" })
          .locator("xpath=following-sibling::dd[1]"),
      ).toHaveText("Sim");
      await page.getByRole("button", { name: "Aprovar cadastro" }).click();
      await page
        .getByRole("checkbox", { name: /confirmo que revisei o cadastro/iu })
        .check();
      await page.getByRole("button", { name: "Confirmar aprovação" }).click();
      await expect
        .poll(async () => (await readAcceptanceAccount(email))?.status, {
          timeout: 20_000,
        })
        .toBe("APPROVED");

      // A company opens the public detail: metrics and badge are there.
      const profileId = await readAcceptanceCreatorProfileId(account!.id);
      expect(profileId).not.toBeNull();
      await page.context().clearCookies();
      await signInAsCompany(page, `/app/creators/${profileId}`);

      await expect(
        page.getByRole("heading", { name: "Painel do Instagram" }),
      ).toBeVisible();
      const panel = page.locator("dl", {
        has: page.locator("dt", { hasText: "Conteúdo compartilhado" }),
      });
      for (const [label, value] of [
        ["Seguidores", "15.000"],
        ["Visualizações", "50.000"],
        ["Interações", "3.200"],
        ["Novos seguidores", "800"],
        ["Conteúdo compartilhado", "22"],
      ] as const) {
        await expect(
          panel
            .locator("dt", { hasText: new RegExp(`^${label}$`, "u") })
            .locator("xpath=following-sibling::dd[1]"),
        ).toHaveText(value);
      }
      await expect(page.getByAltText(JOURNEY_ALT).first()).toBeVisible();
      await expect(
        page.getByRole("link", { name: /jornadadoinfluenciador/iu }).first(),
      ).toHaveAttribute("href", /jornadadoinfluenciador\.com\.br/u);
    } finally {
      await cleanupAcceptanceIdentity(email);
      await cleanupAcceptanceIdentity(adminEmail);
    }
  });

  test("filters the catalog by the CDL and Jornada badges", async ({
    page,
  }, testInfo) => {
    runOnce(testInfo);
    test.setTimeout(120_000);
    const plainEmail = acceptanceEmail("r04-plain");
    await seedAcceptanceAccount({ email: plainEmail });

    try {
      await page.setViewportSize({ height: 1000, width: 1440 });
      await signInAsCompany(page, "/app/catalog");
      // The open dialog hides the page from role queries, so use CSS here.
      const list = page.locator('ul[aria-label="Lista do catálogo"]');
      // Sponsored cards ("Patrocínio") are not profiles and are not filtered.
      const profiles = list.locator(
        ":scope > li:not([aria-label='Patrocínio'])",
      );
      await expect(profiles.first()).toBeVisible();
      const allCount = await profiles.count();
      // Filtering swaps the list: wait past the transient empty state.
      const expectNarrowed = async (ceiling = allCount - 1) => {
        await expect
          .poll(async () => {
            const count = await profiles.count();

            return count > 0 && count <= ceiling;
          })
          .toBe(true);
      };

      await page
        .getByRole("button", { name: "Abrir filtros do catálogo" })
        .click();
      const dialog = page.getByRole("dialog", { name: "Filtrar catálogo" });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText("Selos", { exact: true })).toBeVisible();
      const journeyFilter = dialog.getByRole("checkbox", {
        name: "Fez a Jornada do Influenciador",
      });
      const cdlFilter = dialog.getByRole("checkbox", {
        name: "Associado da CDL",
      });

      await journeyFilter.check();
      await expect(page).toHaveURL(/jornada=1/u);
      await expectNarrowed();
      const journeyTotal = await profiles.count();
      expect(journeyTotal).toBeGreaterThan(0);
      await expect(
        profiles.filter({ has: page.getByAltText(JOURNEY_ALT) }),
      ).toHaveCount(journeyTotal);

      await journeyFilter.uncheck();
      await expect(page).not.toHaveURL(/jornada=1/u);
      await cdlFilter.check();
      await expect(page).toHaveURL(/cdl=1/u);
      await expectNarrowed();
      const cdlTotal = await profiles.count();
      expect(cdlTotal).toBeGreaterThan(0);
      await expect(
        profiles.filter({
          has: page.getByText(/associado da Câmara de Dirigentes Lojistas/iu),
        }),
      ).toHaveCount(cdlTotal);

      // Both together keep only profiles that carry both badges (AND).
      await journeyFilter.check();
      await expect(page).toHaveURL(/jornada=1/u);
      await expect(page).toHaveURL(/cdl=1/u);
      await expectNarrowed(cdlTotal);
      const bothTotal = await profiles.count();
      expect(bothTotal).toBeGreaterThan(0);
      await expect(
        profiles
          .filter({
            has: page.getByText(/associado da Câmara de Dirigentes Lojistas/iu),
          })
          .filter({ has: page.getByAltText(JOURNEY_ALT) }),
      ).toHaveCount(bothTotal);
    } finally {
      await cleanupAcceptanceIdentity(plainEmail);
    }
  });

  test("rotates two public banners on the landing page", async ({
    page,
  }, testInfo) => {
    runOnce(testInfo);
    test.setTimeout(90_000);
    await seedAcceptanceSponsorships({
      featuredCreatorProfileIds: [],
      landingBanners: 2,
      midlistCards: 0,
    });

    try {
      await page.goto("/");
      await declineCookies(page);
      const rotator = page.getByRole("region", {
        name: "Banners patrocinados",
      });
      await expect(rotator).toBeVisible({ timeout: 20_000 });
      const slides = rotator.locator('[aria-roledescription="slide"]');
      expect(await slides.count()).toBeGreaterThanOrEqual(2);
      await expect(
        rotator.getByRole("button", { name: /Ir para o banner 1 de \d/u }),
      ).toHaveAttribute("aria-current", "true");

      // 6 s autoplay: the second indicator becomes current without a click.
      await expect(
        rotator.getByRole("button", { name: /Ir para o banner 2 de \d/u }),
      ).toHaveAttribute("aria-current", "true", { timeout: 12_000 });

      // No pause button: hovering with the mouse pauses the rotation.
      await expect(
        rotator.getByRole("button", { name: /Pausar|Retomar/u }),
      ).toHaveCount(0);
      await rotator.hover();
      await rotator
        .getByRole("button", { name: /Ir para o banner 1 de \d/u })
        .click();
      await page.waitForTimeout(7_000);
      await expect(
        rotator.getByRole("button", { name: /Ir para o banner 1 de \d/u }),
      ).toHaveAttribute("aria-current", "true");
    } finally {
      await removeAcceptanceSponsorships();
    }
  });

  test("shows three featured creators and three sponsored cards in the catalog", async ({
    page,
  }, testInfo) => {
    runOnce(testInfo);
    test.setTimeout(240_000);
    const creatorEmails: string[] = [];
    const featuredProfileIds: string[] = [];

    try {
      // 3 featured creators plus enough extra profiles for cards after the
      // 8th, 16th and 24th entries.
      for (let index = 0; index < 22; index += 1) {
        const email = acceptanceEmail(`r04-catalog-${index}`);
        creatorEmails.push(email);
        const fixture = await seedAcceptanceAccount({ email });

        if (index < 3 && fixture.profileId) {
          featuredProfileIds.push(fixture.profileId);
        }
      }

      await seedAcceptanceSponsorships({
        featuredCreatorProfileIds: featuredProfileIds,
        landingBanners: 0,
        midlistCards: 4,
      });

      await page.setViewportSize({ height: 1000, width: 1440 });
      await signInAsCompany(page, "/app/catalog?pageSize=50");

      const featured = page.getByRole("region", {
        name: /criadores em destaque/iu,
      });
      await expect(featured).toBeVisible({ timeout: 20_000 });
      await expect(
        featured.getByLabel(/Creator em destaque/iu).nth(2),
      ).toBeVisible();

      const sponsored = page
        .getByRole("list", { name: "Lista do catálogo" })
        .getByRole("listitem", { name: "Patrocínio" });
      await expect(sponsored.nth(2)).toBeVisible({ timeout: 20_000 });
      expect(await sponsored.count()).toBeGreaterThanOrEqual(3);

      // Regression: the featured row used to widen the page on phones.
      await page.setViewportSize({ height: 844, width: 390 });
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          ),
        )
        .toBeLessThanOrEqual(0);
    } finally {
      await removeAcceptanceSponsorships();
      for (const email of creatorEmails) {
        await cleanupAcceptanceIdentity(email);
      }
    }
  });

  test("shows the account page in the backoffice without profile editing", async ({
    page,
  }, testInfo) => {
    runOnce(testInfo);
    const adminEmail = acceptanceEmail("r04-backoffice");
    const creatorEmail = acceptanceEmail("r04-account");
    await seedAcceptanceAccount({ email: adminEmail, role: "ADMIN" });
    const fixture = await seedAcceptanceAccount({ email: creatorEmail });

    try {
      await signInAcceptanceUser(page, {
        backoffice: true,
        email: adminEmail,
        nextPath: `/backoffice/accounts/${fixture.accountId}`,
        password: "LocalTest123!",
      });
      await expect(
        page.getByRole("heading", { name: /Creator Aceite/u }).first(),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /Editar perfil/iu }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: /Editar perfil/iu }),
      ).toHaveCount(0);
      await expect(page.getByText(/Para corrigir dados, use/u)).toBeVisible();
      await expect(
        page.getByText("Jornada do Influenciador", { exact: true }).first(),
      ).toBeVisible();

      const edit = await page.request.get(
        `/backoffice/accounts/${fixture.accountId}/edit`,
      );
      expect(edit.status()).toBe(404);
    } finally {
      await cleanupAcceptanceIdentity(creatorEmail);
      await cleanupAcceptanceIdentity(adminEmail);
    }
  });
});

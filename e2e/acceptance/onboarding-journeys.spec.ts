import { expect, test, type Page, type TestInfo } from "@playwright/test";

import {
  acceptanceEmail,
  cleanupAcceptanceIdentity,
  confirmOnboardingSubmission,
  fillCompanyProfileForm,
  fillCreatorProfileForm,
  makeValidCnpj,
  readAcceptanceAccount,
  seedRolelessAcceptanceIdentity,
  signInAcceptanceUser,
  waitForConfirmationLink,
} from "../support/local-acceptance";

function runOnce(testInfo: TestInfo) {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "Database-backed onboarding acceptance journeys run once in Chromium.",
  );
}

async function chooseCompanyRole(page: Page) {
  await expect(
    page.getByRole("dialog", {
      name: "Como você vai usar a Contente Creators?",
    }),
  ).toBeVisible();
  await page.getByRole("radio", { name: /represento uma empresa/iu }).check();
  await page.getByRole("button", { name: "Confirmar tipo de perfil" }).click();
  await expect(page).toHaveURL(/\/onboarding\/company$/u);
}

test.describe("onboarding acceptance journeys", () => {
  test("completes landing intent, combined creator registration, confirmation and pending fallback without a second role step", async ({
    page,
  }, testInfo) => {
    runOnce(testInfo);
    const email = acceptanceEmail("combined-creator");

    try {
      await page.goto("http://localhost:3000/");
      await page
        .getByRole("link", { name: "Sou influencer", exact: true })
        .first()
        .click();
      await expect(page).toHaveURL(/\/sign-up\?intent=influencer$/u);
      await expect(
        page.getByRole("radio", { name: /sou creator/iu }),
      ).toBeChecked();

      await page.getByLabel("E-mail").fill(email);
      await page.getByLabel("Senha", { exact: true }).fill("LocalTest123!");
      await page.getByLabel("Confirmar senha").fill("LocalTest123!");
      await fillCreatorProfileForm(page);
      await confirmOnboardingSubmission(page);

      await expect(
        page.getByText("Confirme seu e-mail", { exact: true }),
      ).toBeVisible();
      const confirmationLink = await waitForConfirmationLink(email);
      await page.goto(confirmationLink);

      await expect(page).toHaveURL(/\/app\/status\/analysis$/u, {
        timeout: 20_000,
      });
      await expect(
        page.getByRole("heading", {
          name: "Seu cadastro está sendo analisado",
        }),
      ).toBeVisible();
      expect(page.url()).not.toContain("/onboarding/role");

      await expect
        .poll(async () => (await readAcceptanceAccount(email))?.status)
        .toBe("PENDING_REVIEW");
      expect((await readAcceptanceAccount(email))?.role).toBe("INFLUENCER");
    } finally {
      await cleanupAcceptanceIdentity(email);
    }
  });

  test("uses the blocking post-Google role choice, applies editable CNPJ suggestions and submits a company", async ({
    page,
  }, testInfo) => {
    runOnce(testInfo);
    const email = acceptanceEmail("google-company");
    const cnpj = makeValidCnpj(927364810001);

    try {
      await seedRolelessAcceptanceIdentity(email);
      await page.route("**/api/company-registry/cnpj/**", async (route) => {
        await route.fulfill({
          body: JSON.stringify({
            data: {
              city: "Curitiba",
              complement: "",
              legalName: "Razão sugerida pela consulta",
              neighborhood: "Centro",
              number: "500",
              postalCode: "80010000",
              segment: "Tecnologia",
              state: "PR",
              street: "Rua da Consulta",
              tradeName: "Nome sugerido",
            },
            status: "success",
          }),
          contentType: "application/json",
          status: 200,
        });
      });
      await signInAcceptanceUser(page, {
        email,
        nextPath: "/onboarding/role",
      });
      await chooseCompanyRole(page);

      await page.getByLabel("CNPJ").fill(cnpj);
      await expect(
        page.getByText("Dados encontrados", { exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Preencher dados encontrados" })
        .click();
      await expect(page.getByLabel("Razão social")).toHaveValue(
        "Razão sugerida pela consulta",
      );
      await page.getByLabel("Razão social").fill("Razão revisada pelo usuário");
      await expect(page.getByLabel("Razão social")).toHaveValue(
        "Razão revisada pelo usuário",
      );
      await fillCompanyProfileForm(page, {
        cnpj,
        legalName: "Razão revisada pelo usuário",
        tradeName: "Empresa Google Aceite",
      });
      await confirmOnboardingSubmission(page);

      await expect(page).toHaveURL(/\/app\/status\/analysis$/u, {
        timeout: 20_000,
      });
      await expect(
        page.getByRole("heading", {
          name: "Seu cadastro está sendo analisado",
        }),
      ).toBeVisible();
      expect((await readAcceptanceAccount(email))?.role).toBe("COMPANY");
      expect((await readAcceptanceAccount(email))?.status).toBe(
        "PENDING_REVIEW",
      );
    } finally {
      await cleanupAcceptanceIdentity(email);
    }
  });

  test("falls back to manual company completion when BrasilAPI is unavailable", async ({
    page,
  }, testInfo) => {
    runOnce(testInfo);
    const email = acceptanceEmail("manual-company");
    const cnpj = makeValidCnpj(617253940001);

    try {
      await seedRolelessAcceptanceIdentity(email);
      await page.route("**/api/company-registry/cnpj/**", async (route) => {
        await route.fulfill({
          body: JSON.stringify({ status: "unavailable" }),
          contentType: "application/json",
          status: 503,
        });
      });
      await signInAcceptanceUser(page, {
        email,
        nextPath: "/onboarding/role",
      });
      await chooseCompanyRole(page);

      await page.getByLabel("CNPJ").fill(cnpj);
      await expect(
        page.getByText("Consulta automática indisponível", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(
          "Preenchimento manual disponível. Você pode continuar normalmente.",
        ),
      ).toBeVisible();
      await fillCompanyProfileForm(page, {
        cnpj,
        tradeName: "Empresa Manual Aceite",
      });
      await confirmOnboardingSubmission(page);

      await expect(page).toHaveURL(/\/app\/status\/analysis$/u, {
        timeout: 20_000,
      });
      expect((await readAcceptanceAccount(email))?.status).toBe(
        "PENDING_REVIEW",
      );
    } finally {
      await cleanupAcceptanceIdentity(email);
    }
  });
});

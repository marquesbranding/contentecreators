import { expect, test, type Page, type TestInfo } from "@playwright/test";

import {
  acceptanceEmail,
  cleanupAcceptanceIdentity,
  confirmOnboardingSubmission,
  fillCompanyProfileForm,
  makeValidCnpj,
  readAcceptanceAccount,
  resetLocalRegistrationRateLimits,
  seedRolelessAcceptanceIdentity,
  signInAcceptanceUser,
} from "../support/local-acceptance";

function runOnce(testInfo: TestInfo) {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "Database-backed onboarding acceptance journeys run once in Chromium.",
  );
}

async function completeAccountStepAsCompany(page: Page, email: string) {
  await signInAcceptanceUser(page, {
    email,
    nextPath: "/onboarding/account",
  });
  await page
    .getByLabel("Nome completo", { exact: true })
    .fill("Responsável pela Empresa");
  await page.getByRole("radio", { name: "Sou empresa", exact: true }).check();
  await page.getByLabel("WhatsApp com DDD").fill("11988887777");
  await page.getByRole("button", { name: "Continuar para o perfil" }).click();
  await expect(page).toHaveURL(/\/onboarding\/company$/u);
}

test.describe("onboarding acceptance journeys", () => {
  test("completes the account step, applies editable CNPJ suggestions and submits a company", async ({
    page,
  }, testInfo) => {
    runOnce(testInfo);
    const email = acceptanceEmail("google-company");
    const cnpj = makeValidCnpj(927364810001);

    try {
      await resetLocalRegistrationRateLimits();
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
      await completeAccountStepAsCompany(page, email);

      await page.getByLabel("CNPJ").fill(cnpj);
      await expect(
        page.getByText("Dados preenchidos automaticamente", { exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel("Razão social")).toHaveValue(
        "Razão sugerida pela consulta",
      );
      await page.getByLabel("Razão social").fill("Razão revisada pelo usuário");
      await expect(page.getByLabel("Razão social")).toHaveValue(
        "Razão revisada pelo usuário",
      );
      await fillCompanyProfileForm(page, {
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
      await resetLocalRegistrationRateLimits();
      await seedRolelessAcceptanceIdentity(email);
      await page.route("**/api/company-registry/cnpj/**", async (route) => {
        await route.fulfill({
          body: JSON.stringify({ status: "unavailable" }),
          contentType: "application/json",
          status: 503,
        });
      });
      await completeAccountStepAsCompany(page, email);

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

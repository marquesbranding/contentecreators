import { expect, test } from "@playwright/test";

import { getBlockingAccessibilityViolations } from "../../src/test/accessibility";

test.describe("identity and first-access routes", () => {
  test("renders supported login methods and recovery navigation", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { level: 1, name: "Entre na sua conta" }),
    ).toBeVisible();
    await expect(page.getByLabel("E-mail")).toHaveAttribute("type", "email");
    await expect(
      page.getByRole("textbox", { name: "Senha", exact: true }),
    ).toHaveAttribute("type", "password");
    await expect(
      page.getByRole("button", { name: "Continuar com o Google" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Esqueci minha senha" }),
    ).toHaveAttribute("href", "/forgot-password");
    await expect(page.getByText(/instagram/iu)).toHaveCount(0);
  });

  test("marks required fields and focuses the first invalid control", async ({
    page,
  }) => {
    await page.goto("/login");

    const email = page.getByLabel("E-mail");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(email).toBeFocused();
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#login-email-error")).toHaveText(
      "Preencha este campo.",
    );
    await expect(
      page.locator('label[for="login-email"] [data-slot="required-indicator"]'),
    ).toHaveCSS("color", "rgb(199, 44, 65)");

    await page.goto("/sign-up");
    await page
      .getByRole("button", { name: "Criar conta e enviar perfil" })
      .click();

    await expect(
      page.getByRole("radiogroup", {
        name: "Como você vai usar a plataforma?",
      }),
    ).toHaveAttribute("aria-invalid", "true");
    await expect(
      page.getByRole("radio", { name: /sou creator/iu }),
    ).toBeFocused();
    await expect(page.locator("#registration-role-error")).toHaveText(
      "Escolha como você vai usar a plataforma.",
    );
  });

  test("opens the complete company variant from landing intent", async ({
    page,
  }) => {
    await page.goto("/sign-up?intent=company");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Crie sua conta e seu perfil",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("radio", { name: /sou empresa/iu }),
    ).toBeChecked();
    await expect(page.getByLabel("CNPJ")).toBeVisible();
    await expect(page.getByLabel("Razão social")).toBeVisible();
    await expect(page.getByLabel("Nome de creator")).toHaveCount(0);
    await expect(
      page
        .getByRole("button", { name: "Continuar com o Google" })
        .locator("xpath=ancestor::form")
        .locator('input[name="role"]'),
    ).toHaveCount(0);
    await expect(page.getByText("ADMIN", { exact: true })).toHaveCount(0);
  });

  test("switches role-specific fields inside the same registration request", async ({
    page,
  }) => {
    await page.goto("/sign-up?intent=influencer");

    await expect(page.getByLabel("Nome de creator")).toBeVisible();
    await page.getByText("Sou empresa", { exact: true }).click();
    await expect(
      page.getByRole("radio", { name: /sou empresa/iu }),
    ).toBeChecked();
    await expect(page.getByLabel("CNPJ")).toBeVisible();
    await expect(page.getByLabel("Nome de creator")).toHaveCount(0);
  });

  test("redirects anonymous protected access and rejects an empty callback", async ({
    page,
  }) => {
    await page.goto("/onboarding/role");

    await expect(page).toHaveURL(/\/login\?next=%2Fonboarding%2Frole$/u);

    await page.goto("/auth/callback");
    await expect(page).toHaveURL(/\/login\?error=callback$/u);
    await expect(page.locator('[data-slot="alert"]')).toContainText(
      "Não foi possível validar este acesso.",
    );

    await page.goto("/reset-password");
    await expect(
      page.getByRole("heading", { name: "Crie uma nova senha" }),
    ).toBeVisible();
    await expect(page.getByText("Link indisponível")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Solicitar um novo link" }),
    ).toHaveAttribute("href", "/forgot-password");
  });

  test("has no horizontal overflow across supported auth widths", async ({
    page,
  }) => {
    for (const width of [320, 390, 768, 1_440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/login");

      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));

      expect(
        dimensions.scrollWidth,
        `horizontal overflow at ${width}px`,
      ).toBeLessThanOrEqual(dimensions.clientWidth);
    }
  });

  test("has no horizontal overflow in the long mobile registration form", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto("/sign-up?intent=company");

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });

  test("@a11y has no serious or critical automated violations", async ({
    page,
  }) => {
    await page.goto("/login");

    expect(await getBlockingAccessibilityViolations(page)).toEqual([]);
  });
});

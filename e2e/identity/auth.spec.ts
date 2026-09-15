import postgres from "postgres";
import { expect, test } from "@playwright/test";

import { getBlockingAccessibilityViolations } from "../../src/test/accessibility";
import {
  acceptanceEmail,
  cleanupAcceptanceIdentity,
  resetLocalRegistrationRateLimits,
  seedRolelessAcceptanceIdentity,
} from "../support/local-acceptance";

async function readAccessCode(email: string) {
  let code: string | undefined;
  await expect
    .poll(
      async () => {
        const inbox = await (
          await fetch(
            `http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
          )
        ).json();
        const message = inbox.messages?.[0];
        if (!message) return false;
        const body = await (
          await fetch(`http://127.0.0.1:54324/api/v1/message/${message.ID}`)
        ).json();
        code = (body.HTML as string).match(/>\s*(\d{6})\s*</)?.[1];
        return Boolean(code);
      },
      { timeout: 15_000 },
    )
    .toBe(true);
  return code!;
}

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
      page.getByRole("separator", { name: "Outras formas de acesso" }),
    ).toContainText("ou continue com");
    await expect(
      page
        .getByRole("button", { name: "Continuar com o Google" })
        .locator('[data-slot="google-auth-icon"]'),
    ).toBeVisible();

    const brandLogo = page
      .getByRole("img", { name: "Contente Creators" })
      .first();

    await expect(brandLogo).toHaveAttribute("data-brand-delivery", "direct");
    await expect
      .poll(() =>
        brandLogo.evaluate(
          (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
        ),
      )
      .toBe(true);
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
    const continueButton = page.getByRole("button", {
      name: "Continuar",
      exact: true,
    });

    await expect(continueButton).toBeDisabled();
    await page.getByLabel("E-mail", { exact: true }).fill("not-an-email");
    await expect(continueButton).toBeDisabled();
    await page
      .getByLabel("E-mail", { exact: true })
      .fill(acceptanceEmail("required-field-check"));
    await expect(continueButton).toBeEnabled();
  });

  test("validates touched fields and keeps password controls usable on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");

    const email = page.getByLabel("E-mail");
    const password = page.getByRole("textbox", {
      name: "Senha",
      exact: true,
    });
    const visibilityButton = page.getByRole("button", {
      name: "Mostrar senha",
    });

    await email.focus();
    await password.focus();

    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#login-email-error")).toHaveText(
      "Preencha este campo.",
    );
    await expect(visibilityButton).toBeVisible();

    const buttonBox = await visibilityButton.boundingBox();
    expect(buttonBox?.width).toBeGreaterThanOrEqual(44);
    expect(buttonBox?.height).toBeGreaterThanOrEqual(44);

    await visibilityButton.click();
    await expect(password).toHaveAttribute("type", "text");

    const registrationEmail = acceptanceEmail("mobile-password-visibility");
    const database = postgres(
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      { max: 1 },
    );
    try {
      await resetLocalRegistrationRateLimits();
      await seedRolelessAcceptanceIdentity(registrationEmail);
      await database`update auth.users set encrypted_password = '' where email = ${registrationEmail}`;
      await page.goto("/login");
      await page.getByLabel("E-mail", { exact: true }).fill(registrationEmail);
      await page.getByLabel("Senha", { exact: true }).fill("Unknown123!");
      await page.getByRole("button", { name: "Entrar", exact: true }).click();
      await expect(page).toHaveURL(/\/sign-up\/verify$/);
      await page
        .getByLabel("Código de 6 dígitos")
        .fill(await readAccessCode(registrationEmail));
      await page
        .getByRole("button", { name: "Confirmar", exact: true })
        .click();
      await expect(page).toHaveURL(/\/onboarding\/account$/);

      const registrationVisibilityButtons = page.getByRole("button", {
        name: "Mostrar senha",
      });

      await expect(registrationVisibilityButtons).toHaveCount(2);
      await expect(registrationVisibilityButtons.first()).toBeVisible();
      await expect(registrationVisibilityButtons.last()).toBeVisible();
    } finally {
      await database.end();
      await cleanupAcceptanceIdentity(registrationEmail);
    }
  });

  test("opens the complete company variant from landing intent", async ({
    page,
  }) => {
    const email = acceptanceEmail("company-landing-intent");
    try {
      await resetLocalRegistrationRateLimits();
      await page.goto("/sign-up?intent=company");
      await page.getByLabel("E-mail", { exact: true }).fill(email);
      await page
        .getByRole("button", { name: "Continuar", exact: true })
        .click();
      await expect(page).toHaveURL(/\/sign-up\/verify$/);
      await page
        .getByLabel("Código de 6 dígitos")
        .fill(await readAccessCode(email));
      await page
        .getByRole("button", { name: "Confirmar", exact: true })
        .click();
      await expect(page).toHaveURL(/\/onboarding\/account$/);

      await expect(
        page.getByRole("radio", { name: "Sou empresa", exact: true }),
      ).toBeChecked();
      await expect(page.getByLabel("CNPJ")).toHaveCount(0);
      await expect(page.getByLabel("Nome de creator")).toHaveCount(0);

      await page
        .getByLabel("Nome completo", { exact: true })
        .fill("Responsável pela Empresa");
      await page.getByLabel("Senha", { exact: true }).fill("LocalTest123!");
      await page
        .getByLabel("Confirmar senha", { exact: true })
        .fill("LocalTest123!");
      await page.getByLabel("WhatsApp com DDD").fill("11988887777");
      await page
        .getByRole("button", { name: "Continuar para o perfil" })
        .click();
      await expect(page).toHaveURL(/\/onboarding\/company$/);
      await expect(page.getByLabel("CNPJ")).toBeVisible();
      await expect(page.getByLabel("Razão social")).toBeVisible();
    } finally {
      await cleanupAcceptanceIdentity(email);
    }
  });

  test("switches account type inside the registration account step", async ({
    page,
  }) => {
    const email = acceptanceEmail("account-type-switch");
    try {
      await seedRolelessAcceptanceIdentity(email);
      await page.goto("/login");
      await page.getByLabel("E-mail", { exact: true }).fill(email);
      await page.getByLabel("Senha", { exact: true }).fill("LocalTest123!");
      await page.getByRole("button", { name: "Entrar", exact: true }).click();
      await expect(page).toHaveURL(/\/onboarding\/account$/);

      await page
        .getByRole("radio", { name: "Sou empresa", exact: true })
        .check();
      await expect(
        page.getByRole("radio", { name: "Sou empresa", exact: true }),
      ).toBeChecked();
      await expect(page.getByLabel("CNPJ")).toHaveCount(0);

      await page
        .getByRole("radio", { name: "Sou influencer", exact: true })
        .check();
      await expect(
        page.getByRole("radio", { name: "Sou influencer", exact: true }),
      ).toBeChecked();
      await expect(
        page.getByRole("radio", { name: "Sou empresa", exact: true }),
      ).not.toBeChecked();
    } finally {
      await cleanupAcceptanceIdentity(email);
    }
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

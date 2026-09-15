import postgres from "postgres";
import { expect, test } from "@playwright/test";
import {
  makeValidCnpj,
  seedRolelessAcceptanceIdentity,
  acceptanceEmail,
  cleanupAcceptanceIdentity,
} from "../support/local-acceptance";

async function readCode(email: string) {
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

test("email first, confirmation, account details, persisted audience and submission", async ({
  page,
  context,
}, testInfo) => {
  test.skip(
    !["desktop-chromium", "mobile-chromium"].includes(testInfo.project.name),
  );
  test.setTimeout(90_000);
  const email = acceptanceEmail(`journey-${testInfo.project.name}`);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    if (testInfo.project.name === "mobile-chromium")
      await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/sign-up?intent=ugc");
    await expect(
      page.getByRole("heading", { name: "Crie sua conta", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Senha", { exact: true })).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath("01-email.png"),
      fullPage: true,
    });
    await page.getByLabel("E-mail", { exact: true }).fill(email);
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
    await page.getByLabel("Código de 6 dígitos").fill(await readCode(email));
    await page.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(page).toHaveURL(/\/onboarding\/account$/);
    await expect(page.getByLabel("E-mail", { exact: true })).toBeDisabled();
    await page
      .getByLabel("Nome completo", { exact: true })
      .fill("Creator Jornada Teste");
    await page.getByLabel("Senha", { exact: true }).fill("LocalTest123!");
    await page
      .getByLabel("Confirmar senha", { exact: true })
      .fill("LocalTest123!");
    await page.getByLabel("WhatsApp com DDD").fill("11999999999");
    await page.screenshot({
      path: testInfo.outputPath("03-account.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Continuar para o perfil" }).click();
    await expect(page).toHaveURL(/\/onboarding\/influencer$/);
    await expect(
      page.getByText("Creator Jornada Teste", { exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("Conte sobre seu conteúdo")
      .fill(
        "Crio conteúdo de tecnologia e cultura para minha comunidade local.",
      );
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(page).toHaveURL(/step=audience/);
    await context.clearCookies();
    await page.goto("/login");
    await page.getByLabel("E-mail", { exact: true }).fill(email);
    await page.getByLabel("Senha", { exact: true }).fill("LocalTest123!");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page).toHaveURL(/\/onboarding\/influencer\?step=audience$/);
    await page
      .getByRole("checkbox", { name: "Instagram", exact: true })
      .check();
    await page.screenshot({
      path: testInfo.outputPath("05-resumed.png"),
      fullPage: true,
    });
    await page
      .getByLabel("Link do perfil no Instagram", { exact: true })
      .fill("https://instagram.com/creator_jornada");
    await page
      .getByLabel("Seguidores no Instagram", { exact: true })
      .fill("1500");
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
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(page).toHaveURL(/step=location/);
    await page.getByLabel("Cidade", { exact: true }).fill("São Paulo");
    await page.getByLabel("UF", { exact: true }).click();
    await page.getByRole("option", { name: "SP", exact: true }).click();
    await page.getByRole("checkbox", { name: /Li e aceito os Termos/ }).check();
    await page
      .getByRole("checkbox", { name: /Li e aceito a Política/ })
      .check();
    await page
      .getByRole("button", { name: "Enviar perfil para análise" })
      .click();
    await page
      .getByRole("button", { name: "Confirmar envio", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Seu cadastro está sendo analisado" }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("06-submitted.png"),
      fullPage: true,
    });
    expect(errors).toEqual([]);
    await context.clearCookies();
    await page.goto("/sign-up");
    await page.getByLabel("E-mail", { exact: true }).fill(email);
    await page.getByLabel("E-mail", { exact: true }).blur();
    await expect(
      page.getByRole("dialog", { name: "Você já possui um cadastro" }),
    ).toBeVisible();
  } finally {
    await cleanupAcceptanceIdentity(email);
  }
});

test("opens the confirmation link in another browser context", async ({
  page,
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  const email = acceptanceEmail("cross-browser-link");
  const other = await browser.newContext();
  try {
    await page.goto("/sign-up");
    await page.getByLabel("E-mail", { exact: true }).fill(email);
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
    await readCode(email);
    const inbox = await (
      await fetch(
        `http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
      )
    ).json();
    const message = await (
      await fetch(
        `http://127.0.0.1:54324/api/v1/message/${inbox.messages[0].ID}`,
      )
    ).json();
    const link = (message.HTML as string)
      .match(/href="([^"]*token_hash[^"]*)"/)?.[1]
      .replaceAll("&amp;", "&");
    expect(link).toBeTruthy();
    const otherPage = await other.newPage();
    await otherPage.goto(link!);
    await expect(otherPage).toHaveURL(/\/onboarding\/account$/);
    await expect(otherPage.getByLabel("E-mail", { exact: true })).toHaveValue(
      email,
    );
    await expect(otherPage.getByLabel("Senha", { exact: true })).toBeVisible();
  } finally {
    await other.close();
    await cleanupAcceptanceIdentity(email);
  }
});

test("sends an access code when an unfinished account has no password", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  const email = acceptanceEmail("passwordless-resume");
  const database = postgres(
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    { max: 1 },
  );
  try {
    await seedRolelessAcceptanceIdentity(email);
    await database`update auth.users set encrypted_password = '', raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb where email = ${email}`;
    await page.goto("/login");
    await page.getByLabel("E-mail", { exact: true }).fill(email);
    await page.getByLabel("Senha", { exact: true }).fill("Unknown123!");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
    await page.getByLabel("Código de 6 dígitos").fill(await readCode(email));
    await page.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(page).toHaveURL(/\/onboarding\/account$/);
    await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();
  } finally {
    await database.end();
    await cleanupAcceptanceIdentity(email);
  }
});

test("keeps the company responsible separate from the company profile and submits all stages", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  const email = acceptanceEmail("company-registration");
  try {
    await seedRolelessAcceptanceIdentity(email);
    await page.route("**/api/company-registry/cnpj/**", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "unavailable" }),
      }),
    );
    await page.goto("/login");
    await page.getByLabel("E-mail", { exact: true }).fill(email);
    await page.getByLabel("Senha", { exact: true }).fill("LocalTest123!");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page).toHaveURL(/\/onboarding\/account$/);
    await page
      .getByLabel("Nome completo", { exact: true })
      .fill("Responsável pela Empresa");
    await page.getByRole("radio", { name: "Sou empresa", exact: true }).check();
    await page.getByLabel("WhatsApp com DDD").fill("11988887777");
    await page.getByRole("button", { name: "Continuar para o perfil" }).click();
    await expect(page).toHaveURL(/\/onboarding\/company$/);
    await page.getByLabel("CNPJ", { exact: true }).fill(makeValidCnpj());
    await page.getByLabel("Razão social").fill("Empresa de Teste Ltda");
    await page.getByLabel("Nome fantasia").fill("Marca de Teste");
    await page.getByLabel("Segmento", { exact: true }).click();
    await page
      .getByRole("option", {
        name: "Tecnologia, games e inovação",
        exact: true,
      })
      .click();
    await page.getByLabel("Tamanho da empresa").click();
    await page
      .getByRole("option", { name: "11 a 50 pessoas", exact: true })
      .click();
    await page
      .getByLabel("Apresente a empresa")
      .fill(
        "Nossa empresa trabalha com tecnologia e procura creators para parcerias locais.",
      );
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(page).toHaveURL(/step=audience/);
    await expect(
      page.getByRole("group", { name: "Redes sociais" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(page).toHaveURL(/step=location/);
    await page.getByLabel("CEP", { exact: true }).fill("01001000");
    await page.getByLabel("Logradouro", { exact: true }).fill("Praça da Sé");
    await page.getByLabel("Número", { exact: true }).fill("100");
    await page.getByLabel("Bairro", { exact: true }).fill("Centro");
    await page.getByLabel("Cidade", { exact: true }).fill("São Paulo");
    await page.getByLabel("UF", { exact: true }).click();
    await page.getByRole("option", { name: "SP", exact: true }).click();
    await page.getByRole("checkbox", { name: /Li e aceito os Termos/ }).check();
    await page
      .getByRole("checkbox", { name: /Li e aceito a Política/ })
      .check();
    await page
      .getByRole("button", { name: "Enviar perfil para análise" })
      .click();
    await page
      .getByRole("button", { name: "Confirmar envio", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Seu cadastro está sendo analisado" }),
    ).toBeVisible();
    await page.getByText("Revisar meus dados", { exact: true }).click();
    await expect(
      page.getByText("Marca de Teste", { exact: true }).last(),
    ).toBeVisible();
  } finally {
    await cleanupAcceptanceIdentity(email);
  }
});

import { expect, test, type Page, type TestInfo } from "@playwright/test";

import { signInThroughUi } from "../support/responsive-audit";

const LOCAL_DOMAIN = "contentecreators.test";
const APPROVED_CREATOR_ID = "d0000000-0000-4000-8000-000000000004";
const CONTACT_HIDDEN_CREATOR_ID = "d0000000-0000-4000-8000-000000000007";

function runOnce(testInfo: TestInfo) {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "The database-backed acceptance journey runs once in Chromium.",
  );
}

async function signIn(
  page: Page,
  localPart: string,
  nextPath: string,
): Promise<void> {
  await signInThroughUi(page, {
    email: `${localPart}@${LOCAL_DOMAIN}`,
    nextPath,
  });
}

async function expectCatalogDenied(page: Page): Promise<void> {
  const responses = await Promise.all([
    page.request.get("/api/catalog/creators"),
    page.request.get(`/api/catalog/creators/${APPROVED_CREATOR_ID}`),
    page.request.get("/api/catalog/companies"),
  ]);

  for (const response of responses) {
    expect([401, 403]).toContain(response.status());
    const body = await response.json();
    expect(JSON.stringify(body)).not.toMatch(
      /Diego Aprova|Empresa Quatro|items|operationalEmail|whatsappE164/u,
    );
  }
}

test.describe("catalog acceptance and privacy", () => {
  test("denies all catalog transports to every non-approved status", async ({
    page,
  }, testInfo) => {
    runOnce(testInfo);

    const cases = [
      {
        destination: "/app/status/analysis",
        fallbackHeading: "Seu cadastro está sendo analisado",
        localPart: "creator-pending",
      },
      {
        destination: "/onboarding/influencer?corrections=requested",
        fallbackHeading: "Conte sobre o seu trabalho",
        localPart: "creator-changes",
      },
      {
        destination: "/app/status/suspended",
        fallbackHeading: "Seu acesso está suspenso",
        localPart: "creator-suspended",
      },
    ] as const;

    for (const account of cases) {
      await page.context().clearCookies();
      await signIn(page, account.localPart, account.destination);

      await page.goto("/app/catalog");
      await expect(
        page.getByRole("heading", { name: account.fallbackHeading }),
      ).toBeVisible();
      await expect(
        page.getByRole("list", { name: "Lista de criadores" }),
      ).toHaveCount(0);

      await expectCatalogDenied(page);
    }

    await page.context().clearCookies();
    await page.goto("/app/status/blocked");
    await expect(
      page.getByRole("heading", { name: "Esta conta está bloqueada" }),
    ).toBeVisible();
    await expectCatalogDenied(page);
  });

  test("lets an approved company search, open details and respects contact consent", async ({
    page,
  }, testInfo) => {
    runOnce(testInfo);

    await signIn(page, "company-approved", "/app/catalog");
    const search = page.getByRole("searchbox", { name: "Buscar criadores" });

    await search.fill("Diego");
    await search.press("Enter");
    const resultLink = page
      .getByRole("list", { name: "Lista de criadores" })
      .getByRole("link", { name: "Ver perfil de Diego Aprova" });
    await expect(resultLink).toBeVisible();
    await resultLink.click();
    await expect(page).toHaveURL(
      new RegExp(`/app/creators/${APPROVED_CREATOR_ID}$`, "u"),
    );
    await expect(
      page.getByRole("link", { name: "Chamar no WhatsApp" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Enviar e-mail" }),
    ).toBeVisible();

    await page.goto(`/app/creators/${CONTACT_HIDDEN_CREATOR_ID}`);
    const contact = page.getByRole("complementary", {
      name: "Ações de contato",
    });
    await expect(contact).toContainText("Contato");
    await expect(
      contact.getByText(
        "Este creator ainda não habilitou o compartilhamento de contatos.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Chamar no WhatsApp" }),
    ).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Enviar e-mail" })).toHaveCount(
      0,
    );
  });

  test("gives an approved creator an other-creator catalog with self-exclusion and safe company carousel", async ({
    page,
  }, testInfo) => {
    runOnce(testInfo);

    await signIn(page, "creator-approved", "/app/catalog");

    const creatorList = page.getByRole("list", {
      name: "Lista de criadores",
    });
    await expect(
      creatorList.getByRole("heading", { name: "Gabi Conecta" }),
    ).toBeVisible();
    await expect(
      creatorList.getByRole("heading", { name: "Diego Aprova" }),
    ).toHaveCount(0);

    const companies = page.getByRole("list", {
      name: "Marcas cadastradas",
    });
    await expect(companies).toBeVisible();
    await expect(companies).toContainText("Empresa Quatro");
    await expect(companies).not.toContainText(/CNPJ|@contentecreators|\+55/u);

    const detail = await page.request.get(
      `/api/catalog/creators/${CONTACT_HIDDEN_CREATOR_ID}`,
    );
    expect(detail.status()).toBe(200);
    const body = await detail.json();
    expect(body.contact).toEqual({
      reason: "VIEWER_NOT_COMPANY",
      status: "UNAVAILABLE",
    });
    expect(JSON.stringify(body)).not.toMatch(
      /operationalEmail|whatsappE164|consentDocument|accountId/u,
    );
  });

  test("keeps anonymous landing, metadata and public enhancements free of participant listings", async ({
    page,
  }, testInfo) => {
    runOnce(testInfo);

    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    const document = await page.content();

    expect(document).not.toMatch(
      /Diego Aprova|Gabi Conecta|Empresa Quatro|creator-approved@|company-approved@/u,
    );
    const robots = page.locator('meta[name="robots"]');
    if ((await robots.count()) > 0) {
      await expect(robots).not.toHaveAttribute("content", /noindex/u);
    }
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /^https?:\/\//u,
    );

    const [catalog, creator, companies, counters, promotion] =
      await Promise.all([
        page.request.get("/api/catalog/creators"),
        page.request.get(`/api/catalog/creators/${APPROVED_CREATOR_ID}`),
        page.request.get("/api/catalog/companies"),
        page.request.get("/api/public/marketing/counters"),
        page.request.get("/api/public/sponsorships/landing"),
      ]);

    expect(catalog.status()).toBe(401);
    expect(creator.status()).toBe(401);
    expect(companies.status()).toBe(401);

    for (const publicResponse of [counters, promotion]) {
      expect(publicResponse.status()).toBeLessThan(500);
      expect(JSON.stringify(await publicResponse.json())).not.toMatch(
        /Diego Aprova|Gabi Conecta|Empresa Quatro|profileId|accountId|logoUrl|whatsapp|email/iu,
      );
    }
  });
});

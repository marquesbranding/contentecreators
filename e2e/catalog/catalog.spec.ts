import { expect, test, type Page } from "@playwright/test";

import { getBlockingAccessibilityViolations } from "../../src/test/accessibility";

const CATALOG_PATH = "/app/catalog";
const LOCAL_PASSWORD = "LocalTest123!";
const APPROVED_COMPANY_EMAIL = "company-approved@contentecreators.test";
const SUPPORTED_WIDTHS = [320, 390, 768, 1_440] as const;

async function signInAsApprovedCompany(page: Page) {
  const nextPath = encodeURIComponent(CATALOG_PATH);

  await page.goto(`/login?next=${nextPath}`);
  await page.getByLabel("E-mail").fill(APPROVED_COMPANY_EMAIL);
  await page.getByLabel("Senha", { exact: true }).fill(LOCAL_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(new RegExp(`${CATALOG_PATH}$`, "u"));
  await expect(
    page.getByRole("searchbox", { name: "Buscar criadores" }),
  ).toBeVisible();
}

async function expectNoHorizontalPageOverflow(page: Page, width: number) {
  const dimensions = await page.evaluate(() => ({
    bodyScrollWidth: document.body.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
  }));

  expect(
    Math.max(dimensions.bodyScrollWidth, dimensions.documentScrollWidth),
    `horizontal overflow at ${width}px`,
  ).toBeLessThanOrEqual(dimensions.clientWidth);
}

test.describe("approved private catalog", () => {
  test("has no horizontal overflow at every supported width", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "The explicit responsive matrix runs once in Chromium.",
    );

    await signInAsApprovedCompany(page);

    for (const width of SUPPORTED_WIDTHS) {
      await page.setViewportSize({ height: 900, width });
      await page.goto(CATALOG_PATH);
      await expect(
        page.getByRole("searchbox", { name: "Buscar criadores" }),
      ).toBeVisible();
      await expectNoHorizontalPageOverflow(page, width);

      const searchBox = page.getByRole("searchbox", {
        name: "Buscar criadores",
      });
      const searchBoxBounds = await searchBox.boundingBox();

      expect(
        searchBoxBounds,
        `missing search box at ${width}px`,
      ).not.toBeNull();
      expect(searchBoxBounds!.x).toBeGreaterThanOrEqual(0);
      expect(searchBoxBounds!.x + searchBoxBounds!.width).toBeLessThanOrEqual(
        width,
      );
    }
  });

  test("opens and closes the mobile filter sheet with keyboard focus restoration", async ({
    page,
  }, testInfo) => {
    test.skip(
      !["mobile-chromium", "mobile-webkit"].includes(testInfo.project.name),
      "The filter sheet is a narrow-viewport interaction.",
    );

    await page.setViewportSize({ height: 844, width: 390 });
    await signInAsApprovedCompany(page);

    const trigger = page.getByRole("button", {
      name: "Abrir filtros do catálogo",
    });
    const triggerBounds = await trigger.boundingBox();

    expect(triggerBounds).not.toBeNull();
    expect(triggerBounds!.height).toBeGreaterThanOrEqual(44);

    await trigger.focus();
    await expect(trigger).toBeFocused();
    await page.keyboard.press("Enter");

    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(
      sheet.getByRole("heading", { name: "Filtrar criadores" }),
    ).toBeVisible();
    await expect
      .poll(() =>
        sheet.evaluate((element) => element.contains(document.activeElement)),
      )
      .toBe(true);

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(trigger).toBeFocused();
    await expectNoHorizontalPageOverflow(page, 390);
  });

  test("@a11y has no serious or critical automated violations", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "The representative catalog axe scan runs once in Chromium.",
    );

    await signInAsApprovedCompany(page);
    await expect(
      page.getByRole("list", { name: "Lista de criadores" }),
    ).toBeVisible();

    expect(await getBlockingAccessibilityViolations(page)).toEqual([]);
  });

  test("keeps search submission and the mobile sheet operable in WebKit", async ({
    page,
  }, testInfo) => {
    test.skip(
      !testInfo.project.name.includes("webkit"),
      "This is the critical WebKit catalog behavior check.",
    );

    await page.setViewportSize({ height: 844, width: 390 });
    await signInAsApprovedCompany(page);

    const searchBox = page.getByRole("searchbox", {
      name: "Buscar criadores",
    });
    await searchBox.fill("Diego");
    await searchBox.press("Enter");

    await expect(page).toHaveURL(/\/app\/catalog\?.*search=Diego/u);
    await expect(searchBox).toHaveValue("Diego");
    await expect(page.getByText("Diego Aprova", { exact: true })).toBeVisible();

    const trigger = page.getByRole("button", {
      name: "Abrir filtros do catálogo",
    });
    await trigger.click();

    const sheet = page.getByRole("dialog");
    await expect(
      sheet.getByRole("heading", { name: "Filtrar criadores" }),
    ).toBeVisible();
    await sheet.getByRole("button", { name: "Mostrar resultados" }).click();
    await expect(sheet).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});

import { expect, test } from "@playwright/test";

import { getBlockingAccessibilityViolations } from "../../src/test/accessibility";

test.describe("public marketing landing", () => {
  test("renders complete public content without participant queries", async ({
    page,
  }) => {
    const protectedRequests: string[] = [];

    page.on("request", (request) => {
      if (/\/api\/(?:catalog|creators|companies)/u.test(request.url())) {
        protectedRequests.push(request.url());
      }
    });

    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Creators e marcas, no mesmo ritmo.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Menos ruído. Mais conexão." }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Da inscrição à conexão, sem complicação.",
      }),
    ).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    expect(protectedRequests).toEqual([]);
  });

  test("keeps Auth intent and login access discoverable", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("link", { name: "Sou influencer" }).first(),
    ).toHaveAttribute("href", "/sign-up?intent=influencer");
    await expect(
      page.getByRole("link", { name: "Sou empresa" }).first(),
    ).toHaveAttribute("href", "/sign-up?intent=company");

    await page
      .getByRole("heading", { name: "Menos ruído. Mais conexão." })
      .scrollIntoViewIfNeeded();

    await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();
  });

  test("supports keyboard focus and reduced motion", async ({
    browser,
    page,
  }) => {
    await page.goto("/");
    const skipLink = page.getByRole("link", {
      name: "Pular para o conteúdo",
    });
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main-content$/u);

    const reducedMotionContext = await browser.newContext({
      reducedMotion: "reduce",
      viewport: { height: 900, width: 390 },
    });
    const reducedMotionPage = await reducedMotionContext.newPage();
    await reducedMotionPage.goto("/");

    await expect
      .poll(() =>
        reducedMotionPage.evaluate(
          () => getComputedStyle(document.documentElement).scrollBehavior,
        ),
      )
      .toBe("auto");

    await reducedMotionContext.close();
  });

  test("has no horizontal overflow at supported widths", async ({ page }) => {
    for (const width of [320, 390, 768, 1_440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");

      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));

      expect(
        dimensions.scrollWidth,
        `horizontal overflow at ${width}px`,
      ).toBeLessThanOrEqual(dimensions.clientWidth);

      const hero = page.getByTestId("marketing-hero");
      const criticalHeroElements = [
        hero.getByRole("heading", { level: 1 }),
        hero.locator("h1 + p"),
        ...(await hero.getByRole("link").all()),
      ];

      for (const element of criticalHeroElements) {
        const box = await element.boundingBox();

        expect(box, `missing hero element box at ${width}px`).not.toBeNull();
        expect(
          box!.x,
          `hero element clipped at ${width}px`,
        ).toBeGreaterThanOrEqual(0);
        expect(
          box!.x + box!.width,
          `hero element clipped at ${width}px`,
        ).toBeLessThanOrEqual(width);
      }
    }
  });

  test("@a11y has no serious or critical automated violations", async ({
    page,
  }) => {
    await page.goto("/");

    expect(await getBlockingAccessibilityViolations(page)).toEqual([]);
  });

  test("matches approved responsive screenshots", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium");

    for (const width of [320, 390, 1_440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await page.addStyleTag({
        content: "nextjs-portal { display: none !important; }",
      });

      for (const animatedText of await page
        .locator('[data-slot="text-animate"]')
        .all()) {
        await animatedText.scrollIntoViewIfNeeded();
        await expect(animatedText.locator(":scope > span").last()).toHaveCSS(
          "opacity",
          "1",
        );
      }
      await page.evaluate(() =>
        window.scrollTo({ behavior: "instant", left: 0, top: 0 }),
      );
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

      await expect(page).toHaveScreenshot(`landing-${width}.png`, {
        animations: "disabled",
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    }
  });
});

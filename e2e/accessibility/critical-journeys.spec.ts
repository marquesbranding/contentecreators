import { expect, test } from "@playwright/test";

import { getWcagAaAccessibilityViolations } from "../../src/test/accessibility";

const representativeAnonymousRoutes = [
  "/",
  "/login",
  "/forgot-password",
  "/sign-up?intent=influencer",
  "/sign-up?intent=company",
  "/privacy",
  "/terms",
] as const;

test.describe("critical accessibility journeys", () => {
  test("provides one keyboard-operable skip link on every route", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "The global keyboard landmark contract is browser-independent.",
    );

    for (const route of representativeAnonymousRoutes) {
      await page.goto(route);
      await page.keyboard.press("Tab");

      const skipLink = page.getByRole("link", {
        name: "Pular para o conteúdo",
      });
      const main = page.locator("main#main-content");

      await expect(skipLink).toBeFocused();
      await expect(skipLink).toBeVisible();
      await expect(main).toHaveCount(1);

      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/#main-content$/u);
      await expect(main).toBeFocused();
    }
  });

  test("@a11y has no automated WCAG A or AA violations", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "The complete anonymous route matrix runs once in Chromium.",
    );

    for (const route of representativeAnonymousRoutes) {
      await page.goto(route);
      expect(
        await getWcagAaAccessibilityViolations(page),
        `WCAG A/AA violations at ${route}`,
      ).toEqual([]);
    }
  });

  test("preserves reflow with enlarged text spacing", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "The deterministic text-spacing matrix runs once in Chromium.",
    );

    await page.setViewportSize({ height: 900, width: 320 });

    for (const route of representativeAnonymousRoutes) {
      await page.goto(route);
      await page.addStyleTag({
        content: `
          * {
            letter-spacing: 0.12em !important;
            line-height: 1.5 !important;
            word-spacing: 0.16em !important;
          }
          p {
            margin-bottom: 2em !important;
          }
        `,
      });

      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: Math.max(
          document.body.scrollWidth,
          document.documentElement.scrollWidth,
        ),
      }));

      expect(
        dimensions.scrollWidth,
        `horizontal overflow with text spacing at ${route}`,
      ).toBeLessThanOrEqual(dimensions.clientWidth);
    }
  });

  test("removes non-essential animation when reduced motion is requested", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "The CSS motion preference contract runs once in Chromium.",
    );

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const motion = await page.evaluate(() => {
      const aurora = document.querySelector<HTMLElement>(".animate-aurora");
      const sampleLink = document.querySelector<HTMLElement>("header a");
      const toMilliseconds = (duration: string) =>
        duration.endsWith("ms")
          ? Number.parseFloat(duration)
          : Number.parseFloat(duration) * 1_000;

      return {
        animationDuration: aurora
          ? toMilliseconds(getComputedStyle(aurora).animationDuration)
          : null,
        scrollBehavior: getComputedStyle(document.documentElement)
          .scrollBehavior,
        transitionDuration: sampleLink
          ? toMilliseconds(getComputedStyle(sampleLink).transitionDuration)
          : null,
      };
    });

    expect(motion.animationDuration).toBeLessThanOrEqual(0.01);
    expect(motion.scrollBehavior).toBe("auto");
    expect(motion.transitionDuration).toBeLessThanOrEqual(0.01);
  });
});

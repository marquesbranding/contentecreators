import { expect, type Page, type TestInfo } from "@playwright/test";

export const RESPONSIVE_AUDIT_WIDTHS = [320, 390, 768, 1_440] as const;

export type ResponsiveAuditWidth = (typeof RESPONSIVE_AUDIT_WIDTHS)[number];

export interface ResponsiveRouteEvidence {
  fixedElements: number;
  heading: string;
  label: string;
  path: string;
  tables: number;
  touchTargets: number;
  width: ResponsiveAuditWidth;
}

interface GeometryAudit {
  clientWidth: number;
  documentScrollWidth: number;
  escapedFixedElements: string[];
  fixedElements: number;
  headingCount: number;
  headingText: string;
  tables: number;
  undersizedTouchTargets: string[];
  visibleTouchTargets: number;
}

export async function signInThroughUi(
  page: Page,
  {
    backoffice = false,
    email,
    nextPath,
  }: {
    backoffice?: boolean;
    email: string;
    nextPath: string;
  },
) {
  const loginPath = backoffice ? "/backoffice/login" : "/login";

  await page.goto(`${loginPath}?next=${encodeURIComponent(nextPath)}`);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("LocalTest123!");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(new URL(nextPath, "http://localhost").pathname);
}

export async function auditResponsiveRoute(
  page: Page,
  testInfo: TestInfo,
  {
    label,
    path,
    width,
  }: {
    label: string;
    path: string;
    width: ResponsiveAuditWidth;
  },
) {
  await page.setViewportSize({ height: 900, width });
  const response = await page.goto(path);
  await expect(page.locator("body")).toBeVisible();
  expect(
    response?.status(),
    `${label} returned an HTTP error at ${width}px`,
  ).toBeLessThan(400);

  const expectedUrl = new URL(path, "http://localhost");
  const currentUrl = new URL(page.url());
  expect(
    `${currentUrl.pathname}${currentUrl.search}`,
    `${label} redirected unexpectedly at ${width}px`,
  ).toBe(`${expectedUrl.pathname}${expectedUrl.search}`);
  await expect(
    page.locator("h1:visible"),
    `${label} did not finish rendering one main heading at ${width}px`,
  ).toHaveCount(1);

  const result = await page.evaluate((): GeometryAudit => {
    const isVisible = (element: Element) => {
      const style = window.getComputedStyle(element);
      const rectangle = element.getBoundingClientRect();

      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0" &&
        style.clipPath === "none" &&
        rectangle.width > 0 &&
        rectangle.height > 0
      );
    };
    const visibleHeadings = [...document.querySelectorAll("h1")].filter(
      isVisible,
    );
    const touchTargetSelector = [
      'button[data-slot="button"]',
      'a[data-slot="button"]',
      'input[data-slot="input"]:not([type="hidden"])',
      '[data-slot="select-trigger"]',
      'textarea[data-slot="textarea"]',
      '[role="button"]:not([data-slot="button"])',
    ].join(",");
    const visibleTouchTargets = [
      ...document.querySelectorAll(touchTargetSelector),
    ].filter(isVisible);
    const undersizedTouchTargets = visibleTouchTargets
      .filter((element) => {
        const rectangle = element.getBoundingClientRect();

        return rectangle.width < 44 || rectangle.height < 44;
      })
      .map((element) => {
        const rectangle = element.getBoundingClientRect();
        const name =
          element.getAttribute("aria-label") ??
          element.getAttribute("name") ??
          (element as HTMLElement).innerText
            ?.trim()
            .replace(/\s+/gu, " ")
            .slice(0, 80) ??
          element.tagName.toLowerCase();

        return `${name} (${Math.round(rectangle.width)}x${Math.round(rectangle.height)})`;
      });
    const fixedElements = [...document.querySelectorAll("body *")].filter(
      (element) => {
        const position = window.getComputedStyle(element).position;

        return isVisible(element) && ["fixed", "sticky"].includes(position);
      },
    );
    const escapedFixedElements = fixedElements
      .filter((element) => {
        const rectangle = element.getBoundingClientRect();

        return (
          Math.round(rectangle.left) < 0 ||
          Math.round(rectangle.right) > document.documentElement.clientWidth
        );
      })
      .map((element) => {
        const rectangle = element.getBoundingClientRect();
        return `${element.tagName.toLowerCase()} (${Math.round(rectangle.left)}..${Math.round(rectangle.right)})`;
      });

    return {
      clientWidth: document.documentElement.clientWidth,
      documentScrollWidth: Math.max(
        document.body.scrollWidth,
        document.documentElement.scrollWidth,
      ),
      escapedFixedElements,
      fixedElements: fixedElements.length,
      headingCount: visibleHeadings.length,
      headingText: visibleHeadings[0]?.textContent?.trim() ?? "",
      tables: [...document.querySelectorAll("table")].filter(isVisible).length,
      undersizedTouchTargets,
      visibleTouchTargets: visibleTouchTargets.length,
    };
  });

  expect(
    result.documentScrollWidth,
    `${label} has horizontal document overflow at ${width}px`,
  ).toBeLessThanOrEqual(result.clientWidth);
  expect(
    result.headingCount,
    `${label} must expose exactly one visible h1 at ${width}px`,
  ).toBe(1);
  expect(
    result.undersizedTouchTargets,
    `${label} has touch targets smaller than 44px at ${width}px`,
  ).toEqual([]);
  expect(
    result.escapedFixedElements,
    `${label} has fixed/sticky elements outside the viewport at ${width}px`,
  ).toEqual([]);

  if (width <= 390) {
    expect(
      result.tables,
      `${label} exposes a desktop table instead of a mobile alternative at ${width}px`,
    ).toBe(0);
  }

  const evidence: ResponsiveRouteEvidence = {
    fixedElements: result.fixedElements,
    heading: result.headingText,
    label,
    path,
    tables: result.tables,
    touchTargets: result.visibleTouchTargets,
    width,
  };

  await testInfo.attach(
    `responsive-${label.toLowerCase().replace(/[^a-z0-9]+/gu, "-")}-${width}`,
    {
      body: Buffer.from(JSON.stringify(evidence, null, 2)),
      contentType: "application/json",
    },
  );

  return evidence;
}

export async function auditResponsiveRoutes(
  page: Page,
  testInfo: TestInfo,
  routes: ReadonlyArray<{ label: string; path: string }>,
) {
  const evidence: ResponsiveRouteEvidence[] = [];

  for (const route of routes) {
    for (const width of RESPONSIVE_AUDIT_WIDTHS) {
      evidence.push(
        await auditResponsiveRoute(page, testInfo, {
          ...route,
          width,
        }),
      );
    }
  }

  await testInfo.attach("responsive-route-matrix", {
    body: Buffer.from(JSON.stringify(evidence, null, 2)),
    contentType: "application/json",
  });
}

export async function expectDialogFitsViewport(page: Page, width: number) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await expect
    .poll(async () => {
      const box = await dialog.boundingBox();

      return box ? Math.round(box.x) : -1;
    })
    .toBeGreaterThanOrEqual(0);

  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(Math.round(box!.x + box!.width)).toBeLessThanOrEqual(width);
  expect(Math.round(box!.height)).toBeLessThanOrEqual(900);
}

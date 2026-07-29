import { expect, test, type Page, type TestInfo } from "@playwright/test";

import {
  auditResponsiveRoutes,
  expectDialogFitsViewport,
  signInThroughUi,
} from "../support/responsive-audit";

const APPROVED_CREATOR_ID = "d0000000-0000-4000-8000-000000000004";
const PENDING_COMPANY_ACCOUNT_ID = "c0000000-0000-4000-8000-000000000002";
const LOCAL_DOMAIN = "contentecreators.test";

function skipOutsideExplicitMatrix(testInfo: TestInfo) {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "The exhaustive four-width matrix runs once in Chromium.",
  );
}

async function signIn(
  page: Page,
  localPart: string,
  nextPath: string,
  backoffice = false,
) {
  await signInThroughUi(page, {
    backoffice,
    email: `${localPart}@${LOCAL_DOMAIN}`,
    nextPath,
  });
}

test.describe("global responsive route matrix", () => {
  test("audits every public and authentication route", async ({
    page,
  }, testInfo) => {
    skipOutsideExplicitMatrix(testInfo);

    await auditResponsiveRoutes(page, testInfo, [
      { label: "Landing", path: "/" },
      { label: "Privacy", path: "/privacy" },
      { label: "Terms", path: "/terms" },
      { label: "Login", path: "/login" },
      { label: "Company registration", path: "/sign-up?intent=company" },
      { label: "Creator registration", path: "/sign-up?intent=influencer" },
      { label: "Forgot password", path: "/forgot-password" },
      { label: "Reset password unavailable", path: "/reset-password" },
      { label: "Confirm email", path: "/confirm-email" },
      { label: "Backoffice login", path: "/backoffice/login" },
    ]);
  });

  test("audits role selection and both onboarding forms", async ({
    page,
  }, testInfo) => {
    skipOutsideExplicitMatrix(testInfo);

    await signIn(page, "role-choice-e2e", "/onboarding/role");
    await auditResponsiveRoutes(page, testInfo, [
      { label: "Role selection", path: "/onboarding/role" },
    ]);

    await page.context().clearCookies();
    await signIn(page, "creator-onboarding", "/onboarding/influencer");
    await auditResponsiveRoutes(page, testInfo, [
      { label: "Creator onboarding", path: "/onboarding/influencer" },
    ]);

    await page.context().clearCookies();
    await signIn(page, "company-onboarding", "/onboarding/company");
    await auditResponsiveRoutes(page, testInfo, [
      { label: "Company onboarding", path: "/onboarding/company" },
    ]);
  });

  test("audits correction forms and every status fallback", async ({
    page,
  }, testInfo) => {
    skipOutsideExplicitMatrix(testInfo);

    const authenticatedRoutes = [
      {
        email: "creator-changes",
        label: "Creator corrections",
        path: "/onboarding/influencer?corrections=requested",
      },
      {
        email: "company-changes",
        label: "Company corrections",
        path: "/onboarding/company?corrections=requested",
      },
      {
        email: "creator-pending",
        label: "Pending analysis",
        path: "/app/status/analysis",
      },
      {
        email: "creator-suspended",
        label: "Suspended account",
        path: "/app/status/suspended",
      },
      {
        email: "ugc-banned",
        label: "Blocked account",
        path: "/app/status/blocked",
      },
    ] as const;

    for (const route of authenticatedRoutes) {
      await page.context().clearCookies();
      await signIn(page, route.email, route.path);
      await auditResponsiveRoutes(page, testInfo, [route]);
    }
  });

  test("audits both approved catalog and profile experiences", async ({
    page,
  }, testInfo) => {
    skipOutsideExplicitMatrix(testInfo);

    await signIn(page, "company-approved", "/app/catalog");
    await auditResponsiveRoutes(page, testInfo, [
      { label: "Company catalog", path: "/app/catalog" },
      {
        label: "Creator detail",
        path: `/app/creators/${APPROVED_CREATOR_ID}`,
      },
      { label: "Company profile", path: "/app/profile" },
    ]);

    await page.context().clearCookies();
    await signIn(page, "creator-approved", "/app/catalog");
    await auditResponsiveRoutes(page, testInfo, [
      { label: "Creator catalog", path: "/app/catalog" },
      { label: "Creator profile", path: "/app/profile" },
    ]);
  });

  test("audits every protected backoffice route", async ({
    page,
  }, testInfo) => {
    skipOutsideExplicitMatrix(testInfo);

    await signIn(page, "admin", "/backoffice", true);
    await auditResponsiveRoutes(page, testInfo, [
      { label: "Backoffice dashboard", path: "/backoffice" },
      { label: "Moderation queue", path: "/backoffice/moderation" },
      {
        label: "Moderation review",
        path: `/backoffice/moderation/${PENDING_COMPANY_ACCOUNT_ID}`,
      },
      { label: "Account management", path: "/backoffice/accounts" },
      {
        label: "Account detail",
        path: `/backoffice/accounts/${PENDING_COMPANY_ACCOUNT_ID}`,
      },
      {
        label: "Account editor",
        path: `/backoffice/accounts/${PENDING_COMPANY_ACCOUNT_ID}/edit`,
      },
      { label: "Audit history", path: "/backoffice/audit" },
      { label: "Email operations", path: "/backoffice/emails" },
      { label: "Sponsorship management", path: "/backoffice/sponsorships" },
    ]);
  });
});

test.describe("responsive overlays and table alternatives", () => {
  test("keeps the backoffice mobile navigation sheet inside 320px", async ({
    page,
  }, testInfo) => {
    skipOutsideExplicitMatrix(testInfo);

    await page.setViewportSize({ height: 900, width: 320 });
    await signIn(page, "admin", "/backoffice", true);
    await page
      .getByRole("button", { name: "Abrir menu do backoffice" })
      .click();

    await expectDialogFitsViewport(page, 320);
    await expect(
      page.getByRole("navigation", { name: "Navegação do backoffice" }),
    ).toBeVisible();
  });

  test("uses mobile alternatives instead of backoffice tables", async ({
    page,
  }, testInfo) => {
    skipOutsideExplicitMatrix(testInfo);

    await page.setViewportSize({ height: 900, width: 390 });
    await signIn(page, "admin", "/backoffice/moderation", true);

    for (const path of [
      "/backoffice/moderation",
      "/backoffice/accounts",
      "/backoffice/audit",
      "/backoffice/emails",
      "/backoffice/sponsorships",
    ]) {
      await page.goto(path);
      await expect(page.locator("table:visible")).toHaveCount(0);
      await expect(page.locator("main")).toBeVisible();
    }
  });
});

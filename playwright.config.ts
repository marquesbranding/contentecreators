import { defineConfig, devices } from "@playwright/test";

import {
  CONSENT_COOKIE_NAME,
  CONSENT_MAX_AGE_SECONDS,
} from "./src/features/cookie-consent/domain/consent-cookie";
import { COOKIE_REGISTRY_VERSION } from "./src/features/cookie-consent/domain/cookie-registry";

const port = Number.parseInt(process.env.PLAYWRIGHT_PORT ?? "3000", 10);

/**
 * Journeys start with the cookie decision already made (declined, the
 * privacy-preserving choice). Otherwise the consent banner, a fixed bottom
 * sheet, covers and intercepts clicks on forms in every spec that is not
 * about cookies.
 */
const declinedCookieConsent = encodeURIComponent(
  JSON.stringify({
    ads: false,
    at: new Date(Date.now() - 60_000).toISOString(),
    v: COOKIE_REGISTRY_VERSION,
  }),
);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    storageState: {
      cookies: ["127.0.0.1", "localhost"].map((domain) => ({
        domain,
        expires: Math.floor(Date.now() / 1000) + CONSENT_MAX_AGE_SECONDS,
        httpOnly: false,
        name: CONSENT_COOKIE_NAME,
        path: "/",
        sameSite: "Lax" as const,
        secure: false,
        value: declinedCookieConsent,
      })),
      origins: [],
    },
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "desktop-webkit",
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile-webkit",
      use: { ...devices["iPhone 15"] },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- --hostname 127.0.0.1 --port ${port}`,
    env: {
      APP_ENV: process.env.APP_ENV ?? "local",
      // Email links must point at the server under test, not a dev port
      // configured in .env.local.
      NEXT_PUBLIC_APP_URL: `http://localhost:${port}`,
    },
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

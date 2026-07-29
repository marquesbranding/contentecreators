import { spawn } from "node:child_process";
import path from "node:path";

import { chromium, type Page } from "@playwright/test";

import { performanceBudgets } from "../src/shared/performance/performance-budgets";

const port = 3_109;
const baseUrl = `http://127.0.0.1:${port}`;

interface LabVitals {
  cls: number;
  fcpMs: number;
  lcpMs: number;
  profile: string;
  ttfbMs: number;
  url: string;
}

async function waitForServer() {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);

      if (response.ok) return;
    } catch {
      // The production server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error("Production server did not become ready within 30 seconds.");
}

async function installVitalObservers(page: Page) {
  await page.addInitScript(() => {
    const metrics = { cls: 0, lcpMs: 0 };

    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries.at(-1);

      if (lastEntry) metrics.lcpMs = lastEntry.startTime;
    }).observe({ buffered: true, type: "largest-contentful-paint" });

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          hadRecentInput: boolean;
          value: number;
        };

        if (!shift.hadRecentInput) metrics.cls += shift.value;
      }
    }).observe({ buffered: true, type: "layout-shift" });

    Object.defineProperty(window, "__LAB_VITALS__", {
      value: metrics,
      writable: false,
    });
  });
}

async function measure(page: Page, profile: string): Promise<LabVitals> {
  await installVitalObservers(page);
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page
    .getByRole("heading", { level: 1, name: /Creators e marcas/u })
    .waitFor();
  await page.waitForTimeout(3_000);

  return page.evaluate(
    ({ profileName, targetUrl }) => {
      const navigation = performance.getEntriesByType(
        "navigation",
      )[0] as PerformanceNavigationTiming;
      const fcp = performance.getEntriesByName("first-contentful-paint").at(-1);
      const metrics = (
        window as typeof window & {
          __LAB_VITALS__: { cls: number; lcpMs: number };
        }
      ).__LAB_VITALS__;

      return {
        cls: metrics.cls,
        fcpMs: fcp?.startTime ?? Number.POSITIVE_INFINITY,
        lcpMs: metrics.lcpMs || Number.POSITIVE_INFINITY,
        profile: profileName,
        ttfbMs: navigation.responseStart,
        url: targetUrl,
      };
    },
    { profileName: profile, targetUrl: baseUrl },
  );
}

function violationsFor(result: LabVitals) {
  const { coreWebVitals } = performanceBudgets;
  const violations: string[] = [];

  if (result.ttfbMs > coreWebVitals.ttfbMs) {
    violations.push(`TTFB ${result.ttfbMs.toFixed(0)} ms`);
  }
  if (result.fcpMs > coreWebVitals.fcpMs) {
    violations.push(`FCP ${result.fcpMs.toFixed(0)} ms`);
  }
  if (result.lcpMs > coreWebVitals.lcpMs) {
    violations.push(`LCP ${result.lcpMs.toFixed(0)} ms`);
  }
  if (result.cls > coreWebVitals.cls) {
    violations.push(`CLS ${result.cls.toFixed(3)}`);
  }

  return violations;
}

async function main() {
  const rootDirectory = process.cwd();
  const nextBin = path.join(
    rootDirectory,
    "node_modules",
    "next",
    "dist",
    "bin",
    "next",
  );
  const server = spawn(
    process.execPath,
    [nextBin, "start", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: rootDirectory,
      env: {
        ...process.env,
        APP_ENV: process.env.APP_ENV ?? "local",
        NODE_ENV: "production",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  try {
    await waitForServer();
    const browser = await chromium.launch({ headless: true });

    try {
      const profiles = [
        {
          context: await browser.newContext({
            deviceScaleFactor: 2,
            hasTouch: true,
            isMobile: true,
            viewport: { height: 844, width: 390 },
          }),
          name: "mobile-390",
        },
        {
          context: await browser.newContext({
            viewport: { height: 900, width: 1_440 },
          }),
          name: "desktop-1440",
        },
      ];
      const results: LabVitals[] = [];

      for (const profile of profiles) {
        const page = await profile.context.newPage();
        results.push(await measure(page, profile.name));
        await profile.context.close();
      }

      process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
      const violations = results.flatMap((result) =>
        violationsFor(result).map(
          (violation) => `${result.profile}: ${violation}`,
        ),
      );

      if (violations.length > 0) {
        throw new Error(
          `Core Web Vitals lab budgets failed:\n- ${violations.join("\n- ")}`,
        );
      }
    } finally {
      await browser.close();
    }
  } finally {
    server.kill("SIGTERM");
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exitCode = 1;
});

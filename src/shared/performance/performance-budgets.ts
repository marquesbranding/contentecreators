export const performanceBudgets = {
  coreWebVitals: {
    cls: 0.1,
    fcpMs: 1_800,
    inpMs: 200,
    lcpMs: 2_500,
    ttfbMs: 800,
  },
  delivery: {
    landingClientJavaScriptGzipBytes: 150_000,
    largestClientChunkGzipBytes: 110_000,
    largestCssChunkGzipBytes: 40_000,
    largestOfficialLogoBytes: 180_000,
    routeClientJavaScriptGzipBytes: 280_000,
    routeClientJavaScriptGzipOverrides: {
      "/(product)/app/catalog/page": 330_000,
      "/(product)/app/profile/page": 310_000,
      "/(product)/onboarding/company/page": 410_000,
      "/(product)/onboarding/influencer/page": 410_000,
      "/backoffice/(protected)/sponsorships/page": 320_000,
    },
    selfHostedFontBytes: 300_000,
  },
} as const;

export interface RouteAssetBudgetResult {
  gzipBytes: number;
  route: string;
}

export interface PerformanceDeliveryReport {
  largestClientChunkGzipBytes: number;
  largestCssChunkGzipBytes: number;
  largestOfficialLogoBytes: number;
  routes: RouteAssetBudgetResult[];
  selfHostedFontBytes: number;
}

export function evaluatePerformanceDeliveryBudgets(
  report: PerformanceDeliveryReport,
) {
  const violations: string[] = [];
  const { delivery } = performanceBudgets;

  if (
    report.largestClientChunkGzipBytes > delivery.largestClientChunkGzipBytes
  ) {
    violations.push(
      `Largest client chunk is ${report.largestClientChunkGzipBytes} B gzip (budget: ${delivery.largestClientChunkGzipBytes} B).`,
    );
  }

  if (report.largestCssChunkGzipBytes > delivery.largestCssChunkGzipBytes) {
    violations.push(
      `Largest CSS chunk is ${report.largestCssChunkGzipBytes} B gzip (budget: ${delivery.largestCssChunkGzipBytes} B).`,
    );
  }

  if (report.largestOfficialLogoBytes > delivery.largestOfficialLogoBytes) {
    violations.push(
      `Largest official logo is ${report.largestOfficialLogoBytes} B (budget: ${delivery.largestOfficialLogoBytes} B).`,
    );
  }

  if (report.selfHostedFontBytes > delivery.selfHostedFontBytes) {
    violations.push(
      `Self-hosted fonts total ${report.selfHostedFontBytes} B (budget: ${delivery.selfHostedFontBytes} B).`,
    );
  }

  for (const route of report.routes) {
    const budget =
      route.route === "/page"
        ? delivery.landingClientJavaScriptGzipBytes
        : (delivery.routeClientJavaScriptGzipOverrides[
            route.route as keyof typeof delivery.routeClientJavaScriptGzipOverrides
          ] ?? delivery.routeClientJavaScriptGzipBytes);

    if (route.gzipBytes > budget) {
      violations.push(
        `${route.route} ships ${route.gzipBytes} B gzip of client JavaScript (budget: ${budget} B).`,
      );
    }
  }

  return violations;
}

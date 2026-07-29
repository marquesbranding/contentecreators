import { describe, expect, it } from "vitest";

import {
  evaluatePerformanceDeliveryBudgets,
  performanceBudgets,
  type PerformanceDeliveryReport,
} from "./performance-budgets";

function passingReport(): PerformanceDeliveryReport {
  return {
    largestClientChunkGzipBytes: 100_000,
    largestCssChunkGzipBytes: 30_000,
    largestOfficialLogoBytes: 170_000,
    routes: [
      { gzipBytes: 140_000, route: "/page" },
      { gzipBytes: 270_000, route: "/app/catalog/page" },
    ],
    selfHostedFontBytes: 290_000,
  };
}

describe("performance delivery budgets", () => {
  it("accepts a production build inside every explicit ceiling", () => {
    expect(evaluatePerformanceDeliveryBudgets(passingReport())).toEqual([]);
  });

  it("reports route, chunk, CSS, font, and official artwork regressions", () => {
    const violations = evaluatePerformanceDeliveryBudgets({
      largestClientChunkGzipBytes:
        performanceBudgets.delivery.largestClientChunkGzipBytes + 1,
      largestCssChunkGzipBytes:
        performanceBudgets.delivery.largestCssChunkGzipBytes + 1,
      largestOfficialLogoBytes:
        performanceBudgets.delivery.largestOfficialLogoBytes + 1,
      routes: [
        {
          gzipBytes:
            performanceBudgets.delivery.landingClientJavaScriptGzipBytes + 1,
          route: "/page",
        },
        {
          gzipBytes:
            performanceBudgets.delivery.routeClientJavaScriptGzipBytes + 1,
          route: "/backoffice/(protected)/page",
        },
      ],
      selfHostedFontBytes: performanceBudgets.delivery.selfHostedFontBytes + 1,
    });

    expect(violations).toHaveLength(6);
    expect(violations.join("\n")).toContain("/page");
    expect(violations.join("\n")).toContain("/backoffice/(protected)/page");
  });
});

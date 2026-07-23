import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

const BLOCKING_IMPACT = new Set(["critical", "serious"]);

export async function getBlockingAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();

  return results.violations.filter((violation) =>
    violation.impact ? BLOCKING_IMPACT.has(violation.impact) : false,
  );
}

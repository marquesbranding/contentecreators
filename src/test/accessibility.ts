import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

const BLOCKING_IMPACT = new Set(["critical", "serious"]);
const WCAG_AA_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
] as const;

export async function getBlockingAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();

  return results.violations.filter((violation) =>
    violation.impact ? BLOCKING_IMPACT.has(violation.impact) : false,
  );
}

export async function getWcagAaAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags([...WCAG_AA_TAGS])
    .analyze();

  return results.violations;
}

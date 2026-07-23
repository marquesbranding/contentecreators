import axe, { type AxeResults, type RunOptions } from "axe-core";

const BLOCKING_IMPACT = new Set(["critical", "serious"]);

export async function getBlockingComponentAccessibilityViolations(
  context: axe.ElementContext,
  options?: RunOptions,
) {
  const results: AxeResults = await axe.run(context, options ?? {});

  return results.violations.filter((violation) =>
    violation.impact ? BLOCKING_IMPACT.has(violation.impact) : false,
  );
}

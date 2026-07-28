import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../../../../");
const workflowPath = resolve(
  projectRoot,
  "docs/operations/data-subject-requests.md",
);
const launchBlockersPath = resolve(projectRoot, "docs/launch-blockers.md");

const requiredGateMarkers = [
  "<!-- DSR-GATE:01-INTAKE -->",
  "<!-- DSR-GATE:02-VERIFY-IDENTITY -->",
  "<!-- DSR-GATE:03-TRIAGE-AND-SCOPE -->",
  "<!-- DSR-GATE:04-FULFILLMENT-PLAN -->",
  "<!-- DSR-GATE:05-APPROVAL -->",
  "<!-- DSR-GATE:06-EXECUTION -->",
  "<!-- DSR-GATE:07-VERIFICATION -->",
  "<!-- DSR-GATE:08-DELIVERY-AND-CLOSURE -->",
] as const;

const requiredSafetyStatements = [
  "Do not execute any request until the subject's identity and authority are verified.",
  "Never include credentials, tokens, signed URLs, SMTP secrets, or another participant's personal data in an export.",
  "Immutable audit and moderation history is never edited or deleted ad hoc.",
  "Deletion or anonymization requires an explicit client/legal decision and approval reference for each retained, deleted, anonymized, or restricted data class.",
  "No automatic retention interval, deletion schedule, response deadline, or export-link lifetime is defined by this runbook.",
  "All subject-facing acknowledgements and decisions are written in polished Brazilian Portuguese.",
] as const;

describe("manual data-subject request workflow", () => {
  it("keeps every mandatory gate ordered and the high-risk controls explicit", async () => {
    const workflow = await readFile(workflowPath, "utf8");
    const normalizedWorkflow = workflow.replace(/\s+/gu, " ");
    let previousMarkerIndex = -1;

    for (const marker of requiredGateMarkers) {
      const markerIndex = workflow.indexOf(marker);

      expect(markerIndex, `${marker} must exist`).toBeGreaterThan(-1);
      expect(
        markerIndex,
        `${marker} must appear after the previous gate`,
      ).toBeGreaterThan(previousMarkerIndex);
      previousMarkerIndex = markerIndex;
    }

    for (const statement of requiredSafetyStatements) {
      expect(normalizedWorkflow).toContain(statement);
    }

    expect(workflow).toContain("Correction");
    expect(workflow).toContain("Secure export");
    expect(workflow).toContain("Deletion or anonymization");
    expect(workflow).toContain("Evidence register");
    expect(workflow).toContain("DRY_RUN");
    expect(workflow).toContain("EXECUTE");
  });

  it("does not invent a numeric retention, response, or delivery interval", async () => {
    const workflow = await readFile(workflowPath, "utf8");

    expect(workflow).not.toMatch(
      /\b\d+\s*(?:(?:business|calendar)\s*)?(?:days?|weeks?|months?|years?|dias?|semanas?|meses?|anos?)\b/iu,
    );
    expect(workflow).not.toMatch(
      /\b(?:retain|retention|delete|deletion|anonymize|anonymization|respond|response|download|delivery|expir(?:e|y))\w*[^\n.]{0,80}\b\d+\b/iu,
    );
  });

  it("links the baseline procedure while preserving client/legal launch gates", async () => {
    const launchBlockers = await readFile(launchBlockersPath, "utf8");

    expect(launchBlockers).toContain(
      "- [ ] LGPD data-subject export, correction, deletion/anonymization",
    );
    expect(launchBlockers).toContain(
      "[manual workflow baseline](./operations/data-subject-requests.md)",
    );
    expect(launchBlockers).toContain(
      "- [ ] Audit and operational data-retention decisions",
    );
    expect(launchBlockers).not.toContain(
      "- [x] LGPD data-subject export, correction, deletion/anonymization",
    );
    expect(launchBlockers).not.toContain(
      "- [x] Audit and operational data-retention decisions",
    );
  });
});

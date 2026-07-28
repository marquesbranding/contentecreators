import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const threatModelPath = resolve(root, "docs/security/threat-model.md");
const threatModel = readFileSync(threatModelPath, "utf8");
const requiredThreats = [
  "TM-AUTH-01",
  "TM-IDOR-01",
  "TM-RLS-01",
  "TM-STORAGE-01",
  "TM-ADMIN-01",
  "TM-BAN-01",
  "TM-CNPJ-01",
  "TM-SMTP-01",
  "TM-PUBLIC-01",
] as const;

describe("Beta threat model", () => {
  it("covers every required security boundary with a residual decision", () => {
    for (const threat of requiredThreats) {
      expect(threatModel).toMatch(new RegExp(`\\|\\s*${threat}\\s*\\|`, "u"));
    }

    expect(threatModel).not.toMatch(
      /\|\s*(?:High|Critical)\s*\|[^]*\|\s*(?:Open|Accepted)\s*\|/iu,
    );
  });

  it("links each finding to executable automated evidence", () => {
    const evidencePaths = [
      ...threatModel.matchAll(/`(src\/[^`]+\.test\.(?:ts|tsx))`/gu),
    ].map((match) => match[1]!);

    expect(new Set(evidencePaths).size).toBeGreaterThanOrEqual(
      requiredThreats.length,
    );
    for (const evidencePath of evidencePaths) {
      expect(existsSync(resolve(root, evidencePath)), evidencePath).toBe(true);
    }
  });
});

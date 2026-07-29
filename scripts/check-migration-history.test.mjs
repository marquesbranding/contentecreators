import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertUsableBaseRevision,
  buildComparisonRange,
  parseMigrationChanges,
  validateMigrationChanges,
} from "./check-migration-history.mjs";

describe("migration history guard", () => {
  it("allows only newly added, timestamped SQL migrations", () => {
    const changes = parseMigrationChanges(
      "A\tsupabase/migrations/20260729120000_add_delivery_guard.sql\n",
    );

    assert.deepEqual(validateMigrationChanges(changes), []);
  });

  it("rejects modified, deleted, copied, and renamed migration history", () => {
    const changes = parseMigrationChanges(
      [
        "M\tsupabase/migrations/20260723174000_core_schema.sql",
        "D\tsupabase/migrations/20260723180000_audit_revisions.sql",
        "R100\tsupabase/migrations/20260723190000_onboarding_reference_data.sql\tsupabase/migrations/20260729120000_reference_data.sql",
        "C100\tsupabase/migrations/20260724113500_query_plan_indexes.sql\tsupabase/migrations/20260729130000_query_plan_indexes.sql",
      ].join("\n"),
    );

    assert.deepEqual(validateMigrationChanges(changes), [
      "M supabase/migrations/20260723174000_core_schema.sql",
      "D supabase/migrations/20260723180000_audit_revisions.sql",
      "R100 supabase/migrations/20260723190000_onboarding_reference_data.sql -> supabase/migrations/20260729120000_reference_data.sql",
      "C100 supabase/migrations/20260724113500_query_plan_indexes.sql -> supabase/migrations/20260729130000_query_plan_indexes.sql",
    ]);
  });

  it("rejects newly added migrations outside the naming convention", () => {
    const changes = parseMigrationChanges(
      [
        "A\tsupabase/migrations/add-table.sql",
        "A\tsupabase/migrations/20260729120000_AddTable.sql",
        "A\tsupabase/migrations/2026072912000_too_short.sql",
      ].join("\n"),
    );

    assert.deepEqual(validateMigrationChanges(changes), [
      "A supabase/migrations/add-table.sql (expected YYYYMMDDHHMMSS_lower_snake_case.sql)",
      "A supabase/migrations/20260729120000_AddTable.sql (expected YYYYMMDDHHMMSS_lower_snake_case.sql)",
      "A supabase/migrations/2026072912000_too_short.sql (expected YYYYMMDDHHMMSS_lower_snake_case.sql)",
    ]);
  });

  it("accepts a pull request without migration changes", () => {
    assert.deepEqual(validateMigrationChanges(parseMigrationChanges("")), []);
  });

  it("fails closed when a push event has an all-zero previous revision", () => {
    assert.throws(
      () =>
        assertUsableBaseRevision("0000000000000000000000000000000000000000"),
      /no trusted previous revision/u,
    );
  });

  it("uses merge-base comparison for pull requests and direct trees for pushes", () => {
    assert.equal(
      buildComparisonRange("base", "head", "merge-base"),
      "base...head",
    );
    assert.equal(
      buildComparisonRange("before", "after", "direct"),
      "before..after",
    );
    assert.throws(
      () => buildComparisonRange("base", "head", "unknown"),
      /unsupported migration comparison mode/iu,
    );
  });
});

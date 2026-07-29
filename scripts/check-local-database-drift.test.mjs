import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseDatabaseDiff,
  validateDatabaseDiff,
} from "./check-local-database-drift.mjs";

describe("local database drift guard", () => {
  it("accepts an empty Supabase schema diff", () => {
    const result = parseDatabaseDiff(
      '{"diff":"","file":null,"schemas":["public","storage"],"engine":"pg-delta","dropStatements":[],"message":"Diff complete."}',
    );

    assert.doesNotThrow(() => validateDatabaseDiff(result));
  });

  it("rejects SQL drift between migrations and the reset database", () => {
    const result = parseDatabaseDiff(
      JSON.stringify({
        diff: "alter table public.accounts add column unexpected text;",
        dropStatements: [],
        schemas: ["public", "storage"],
      }),
    );

    assert.throws(
      () => validateDatabaseDiff(result),
      /database schema differs from committed migrations/u,
    );
  });

  it("rejects malformed CLI output instead of silently passing", () => {
    assert.throws(
      () => parseDatabaseDiff("not-json"),
      /could not parse Supabase db diff output/iu,
    );
  });

  it("fails closed when the CLI result omits the expected public diff", () => {
    assert.throws(
      () => validateDatabaseDiff({ message: "Diff complete." }),
      /unexpected result/u,
    );
  });

  it("fails closed when Storage or drop-statement evidence is omitted", () => {
    assert.throws(
      () =>
        validateDatabaseDiff({
          diff: "",
          dropStatements: [],
          schemas: ["public"],
        }),
      /unexpected result/u,
    );
    assert.throws(
      () =>
        validateDatabaseDiff({
          diff: "",
          schemas: ["public", "storage"],
        }),
      /unexpected result/u,
    );
  });
});

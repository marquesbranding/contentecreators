import { afterAll, describe, expect, it } from "vitest";
import { createDatabaseClient } from "@/db/client";
import { createVerifiedAccountTransactionRunner } from "@/features/identity/server";
import { findEligibleCreators } from "./eligible-creators.repository";
const client = createDatabaseClient(
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
);
const run = createVerifiedAccountTransactionRunner({
  database: client.database,
  resolveVerifiedAuthUserId: async () => "10000000-0000-4000-8000-000000000001",
});
const suite =
  process.env.RUN_LOCAL_STACK_TESTS === "true" ? describe : describe.skip;
suite("eligible sponsorship creators", () => {
  afterAll(async () => {
    await client.client.end({ timeout: 2 });
  });
  it("finds approved complete profiles by name and excludes pending or suspended creators", async () => {
    await run(
      { requestId: "sponsorship-eligible-search" },
      async (transaction) => {
        const approved = await findEligibleCreators(transaction, "Diego");
        expect(
          approved.some((item) => item.displayName === "Diego Aprova"),
        ).toBe(true);
        expect(await findEligibleCreators(transaction, "Bruno")).toEqual([]);
        expect(await findEligibleCreators(transaction, "Elisa")).toEqual([]);
        expect(await findEligibleCreators(transaction, "%")).toEqual([]);
      },
    );
  });
});

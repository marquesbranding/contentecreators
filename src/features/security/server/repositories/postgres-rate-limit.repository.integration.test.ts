import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

import { createRateLimitKey } from "@/shared/server/security/rate-limit";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const sql = postgres(databaseUrl, {
  connect_timeout: 5,
  idle_timeout: 1,
  max: 1,
  prepare: false,
});

describeLocalStack("Postgres rate limit", () => {
  afterAll(async () => {
    await sql.end({ timeout: 2 });
  });

  it("atomically rejects requests after the fixed-window capacity", async () => {
    const keyHash = createRateLimitKey(["synthetic:rate-limit-integration"]);
    await sql`
      delete from public.rate_limit_buckets
      where scope = 'integration_test'
        and key_hash = ${keyHash}
    `;

    const decisions = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const [decision] = await sql<
        {
          allowed: boolean;
          remaining: number;
          retry_after_seconds: number;
        }[]
      >`
        select *
        from public.consume_rate_limit(
          'integration_test',
          ${keyHash},
          2,
          60
        )
      `;
      decisions.push(decision);
    }

    expect(decisions).toEqual([
      { allowed: true, remaining: 1, retry_after_seconds: 60 },
      {
        allowed: true,
        remaining: 0,
        retry_after_seconds: expect.any(Number),
      },
      {
        allowed: false,
        remaining: 0,
        retry_after_seconds: expect.any(Number),
      },
    ]);

    const [stored] = await sql<
      { key_hash: string; request_count: number; scope: string }[]
    >`
      select scope, key_hash, request_count
      from public.rate_limit_buckets
      where scope = 'integration_test'
        and key_hash = ${keyHash}
    `;
    expect(stored).toEqual({
      key_hash: keyHash,
      request_count: 2,
      scope: "integration_test",
    });
    expect(JSON.stringify(stored)).not.toContain("rate-limit-integration");
  });

  it("keeps buckets unavailable to normal authenticated SQL roles", async () => {
    await expect(
      sql.begin(async (transaction) => {
        await transaction`set local role authenticated`;
        await transaction`select * from public.rate_limit_buckets limit 1`;
      }),
    ).rejects.toThrow(/permission denied/iu);
  });
});

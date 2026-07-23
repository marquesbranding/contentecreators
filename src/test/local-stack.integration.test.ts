import { connect } from "node:net";

import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const database = postgres(databaseUrl, {
  max: 1,
  connect_timeout: 5,
  idle_timeout: 1,
});

async function expectHealthy(url: string) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(5_000),
  });

  expect(response.ok, `${url} returned HTTP ${response.status}`).toBe(true);
}

async function expectTcpConnection(host: string, port: number) {
  await new Promise<void>((resolve, reject) => {
    const socket = connect({ host, port });

    socket.setTimeout(5_000);
    socket.once("connect", () => {
      socket.destroy();
      resolve();
    });
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error(`Timed out connecting to ${host}:${port}`));
    });
    socket.once("error", reject);
  });
}

describeLocalStack("local Supabase and application email stack", () => {
  afterAll(async () => {
    await database.end({ timeout: 2 });
  });

  it("accepts direct and pooled Postgres connections", async () => {
    await expectTcpConnection("127.0.0.1", 54322);
    await expectTcpConnection("127.0.0.1", 54329);

    const [{ database_name: databaseName }] = await database<
      { database_name: string }[]
    >`select current_database() as database_name`;

    expect(databaseName).toBe("postgres");
  });

  it("keeps Auth, Storage, and both email-capture services healthy", async () => {
    await Promise.all([
      expectHealthy("http://127.0.0.1:54321/auth/v1/health"),
      expectHealthy("http://127.0.0.1:54321/storage/v1/status"),
      expectHealthy("http://127.0.0.1:54324/livez"),
      expectHealthy("http://127.0.0.1:8025/livez"),
    ]);
  });

  it("recreates the private media buckets from committed configuration", async () => {
    const buckets = await database<
      {
        id: string;
        is_public: boolean;
        file_size_limit: number | null;
      }[]
    >`
      select
        id,
        public as is_public,
        file_size_limit::integer
      from storage.buckets
      where id in ('profile-media', 'sponsorship-media')
      order by id
    `;

    expect(buckets).toEqual([
      {
        id: "profile-media",
        is_public: false,
        file_size_limit: 8 * 1024 * 1024,
      },
      {
        id: "sponsorship-media",
        is_public: false,
        file_size_limit: 8 * 1024 * 1024,
      },
    ]);
  });
});

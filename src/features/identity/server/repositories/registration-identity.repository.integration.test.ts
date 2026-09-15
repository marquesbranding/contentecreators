import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { createDatabaseClient } from "@/db/client";
import { createRegistrationIdentityRepository } from "./registration-identity.repository";
const local =
  process.env.RUN_LOCAL_STACK_TESTS === "true" ? describe : describe.skip;
const url = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const db = createDatabaseClient(url);
const sql = postgres(url, { max: 1 });
const repository = createRegistrationIdentityRepository(db.database);
const fixtureIds: string[] = [];
local("registration identity persistence", () => {
  afterAll(async () => {
    for (const id of fixtureIds) {
      await sql`delete from public.accounts where auth_user_id = ${id}`;
      await sql`delete from auth.users where id = ${id}`;
    }
    await db.client.end();
    await sql.end();
  });
  it("creates only one roleless account under concurrent confirmation, preserving name and stage", async () => {
    const id = crypto.randomUUID();
    const email = `new-${id}@contentecreators.test`;
    fixtureIds.push(id);
    await sql`insert into auth.users (id, email, email_confirmed_at) values (${id}, ${email}, now())`;
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        repository.ensure(id, email, "Pessoa Teste"),
      ),
    );
    expect(new Set(results.map((account) => account.id)).size).toBe(1);
    expect(results[0]).toMatchObject({
      role: null,
      status: "ONBOARDING",
      registrationStep: "ACCOUNT_DETAILS",
      fullName: "Pessoa Teste",
    });
    expect(await repository.lookup(email)).toMatchObject({
      status: "registered",
      hasPassword: false,
    });
    await sql`update public.accounts set archived_at = now() where auth_user_id = ${id}`;
  });
  it("distinguishes unused, unconfirmed and password-backed emails", async () => {
    const id = crypto.randomUUID();
    const email = `pending-${id}@contentecreators.test`;
    fixtureIds.push(id);
    expect(await repository.lookup(email)).toEqual({ status: "available" });
    await sql`insert into auth.users (id, email, encrypted_password) values (${id}, ${email}, 'test-hash')`;
    expect(await repository.lookup(email)).toEqual({ status: "unconfirmed" });
    await sql`update auth.users set email_confirmed_at = now() where id = ${id}`;
    expect(await repository.lookup(email)).toMatchObject({
      status: "registered",
      hasPassword: true,
    });
  });
});

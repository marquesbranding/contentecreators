import { describe, expect, it } from "vitest";

import { parsePublicEnv } from "./public-env";
import { parseServerEnv } from "./server-env-schema";

const validPublicEnv = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_test",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
};

describe("environment parsing", () => {
  it("returns the typed public environment", () => {
    expect(parsePublicEnv(validPublicEnv)).toEqual(validPublicEnv);
  });

  it("reports missing public keys without leaking supplied values", () => {
    expect(() =>
      parsePublicEnv({
        NEXT_PUBLIC_APP_URL: "not-a-url",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sensitive-value",
      }),
    ).toThrowError(
      "Invalid public environment variables: NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_SUPABASE_URL",
    );
  });

  it("coerces the server port and secure flag", () => {
    const parsed = parseServerEnv({
      ...validPublicEnv,
      APP_ENV: "local",
      CRON_SECRET: "local-cron-secret-at-least-32-characters",
      DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      DIRECT_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      PUBLIC_SOCIAL_PROOF_ENABLED: "false",
      SMTP_FROM_EMAIL: "no-reply@contentecreators.test",
      SMTP_FROM_NAME: "Contente Creators",
      SMTP_HOST: "127.0.0.1",
      SMTP_PASSWORD: "local-password",
      SMTP_PORT: "1025",
      SMTP_SECURE: "false",
      SMTP_USER: "local-user",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-local-test",
    });

    expect(parsed.SMTP_PORT).toBe(1025);
    expect(parsed.SMTP_SECURE).toBe(false);
    expect(parsed.APP_ENV).toBe("local");
    expect(parsed.PUBLIC_SOCIAL_PROOF_ENABLED).toBe(false);
  });

  it("never enables public social proof through environment configuration", () => {
    expect(() =>
      parseServerEnv({
        ...validPublicEnv,
        APP_ENV: "local",
        CRON_SECRET: "local-cron-secret-at-least-32-characters",
        DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
        DIRECT_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
        PUBLIC_SOCIAL_PROOF_ENABLED: "true",
        SMTP_FROM_EMAIL: "no-reply@contentecreators.test",
        SMTP_FROM_NAME: "Contente Creators",
        SMTP_HOST: "127.0.0.1",
        SMTP_PASSWORD: "local-password",
        SMTP_PORT: "1025",
        SMTP_SECURE: "false",
        SMTP_USER: "local-user",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-local-test",
      }),
    ).toThrowError(
      "Invalid server environment variables: PUBLIC_SOCIAL_PROOF_ENABLED",
    );
  });
});

import { describe, expect, it } from "vitest";

import {
  createVercelBuildPlan,
  PRODUCTION_INITIAL_ADMIN,
} from "./vercel-build-plan";

const productionEnvironment = {
  APP_ENV: "production",
  DATABASE_URL:
    "postgresql://postgres.production-ref:secret@aws-0-sa-east-1.pooler.supabase.com:6543/postgres",
  DIRECT_URL:
    "postgresql://postgres:secret@db.production-ref.supabase.co:5432/postgres",
  NEXT_PUBLIC_SUPABASE_URL: "https://production-ref.supabase.co",
  VERCEL: "1",
  VERCEL_ENV: "production",
  VERCEL_GIT_COMMIT_REF: "main",
};

describe("Vercel build plan", () => {
  it("keeps local and preview builds free of hosted database mutations", () => {
    expect(createVercelBuildPlan({ APP_ENV: "local" })).toEqual({
      mode: "BUILD_ONLY",
    });

    expect(
      createVercelBuildPlan({
        ...productionEnvironment,
        APP_ENV: "development",
        VERCEL_ENV: "preview",
      }),
    ).toEqual({
      mode: "BUILD_ONLY",
    });
  });

  it("uses Vercel Supabase integration aliases for production", () => {
    expect(
      createVercelBuildPlan({
        ...productionEnvironment,
        DATABASE_URL: undefined,
        DIRECT_URL: undefined,
        POSTGRES_URL: productionEnvironment.DATABASE_URL,
        POSTGRES_URL_NON_POOLING: productionEnvironment.DIRECT_URL,
      }),
    ).toEqual({
      databaseUrl: productionEnvironment.DATABASE_URL,
      directUrl: productionEnvironment.DIRECT_URL,
      initialAdmin: PRODUCTION_INITIAL_ADMIN,
      mode: "PRODUCTION_DEPLOY",
      projectRef: "production-ref",
      supabaseUrl: "https://production-ref.supabase.co",
    });
  });

  it.each([
    [
      "hidden Vercel system variables",
      { VERCEL: undefined, VERCEL_ENV: undefined },
    ],
    ["production configuration in Preview", { VERCEL_ENV: "preview" }],
    ["wrong application environment", { APP_ENV: "development" }],
    ["wrong production branch", { VERCEL_GIT_COMMIT_REF: "develop" }],
    [
      "cross-project database",
      {
        DIRECT_URL:
          "postgresql://postgres:secret@db.development-ref.supabase.co:5432/postgres",
      },
    ],
    [
      "non-Supabase API origin",
      { NEXT_PUBLIC_SUPABASE_URL: "https://database.example.com" },
    ],
  ])("rejects a production deployment with %s", (_label, override) => {
    expect(() =>
      createVercelBuildPlan({
        ...productionEnvironment,
        ...override,
      }),
    ).toThrow();
  });
});

import { describe, expect, it } from "vitest";

import { initialAdminBootstrapSchema } from "@/features/identity/schemas/admin-provisioning-schema";

import {
  createVercelBuildPlan,
  PRODUCTION_INITIAL_ADMINS,
} from "./vercel-build-plan";

const productionEnvironment = {
  APP_ENV: "production",
  DATABASE_URL:
    "postgresql://postgres.production-ref:secret@aws-0-sa-east-1.pooler.supabase.com:6543/postgres",
  DIRECT_URL:
    "postgresql://postgres:secret@db.production-ref.supabase.co:5432/postgres",
  NEXT_PUBLIC_SUPABASE_URL: "https://production-ref.supabase.co",
  PRODUCTION_ADMIN_INITIAL_PASSWORD: "example-only-production-password",
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
      initialAdmins: PRODUCTION_INITIAL_ADMINS,
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
      "missing initial administrator password",
      { PRODUCTION_ADMIN_INITIAL_PASSWORD: undefined },
    ],
    [
      "weak initial administrator password",
      { PRODUCTION_ADMIN_INITIAL_PASSWORD: "short" },
    ],
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

describe("production administrator list", () => {
  it("contains only entries the production bootstrap will accept", () => {
    /* The Vercel production build validates every entry with this schema just
       before provisioning. An invalid email or approval reference would stop
       the deploy at that step, so catch it here first. */
    for (const admin of PRODUCTION_INITIAL_ADMINS) {
      expect(initialAdminBootstrapSchema.safeParse(admin).success).toBe(true);
    }
    expect(
      new Set(PRODUCTION_INITIAL_ADMINS.map((admin) => admin.email)).size,
    ).toBe(PRODUCTION_INITIAL_ADMINS.length);
  });
});

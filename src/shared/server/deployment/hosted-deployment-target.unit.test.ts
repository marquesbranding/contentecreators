import { describe, expect, it } from "vitest";

import {
  assertDatabaseConnectionTargets,
  assertHostedDeploymentConfiguration,
  assertMigrationLedger,
  assertVercelDeploymentUrl,
  hostedDeploymentTargets,
  parseHostedDeploymentTarget,
} from "./hosted-deployment-target";

const developmentConfiguration = {
  appEnv: "development",
  appUrl: "https://dev.contentecreators.test",
  publicSocialProofEnabled: "false",
  supabaseProjectName: "contente-creators-dev",
  supabaseUrl: "https://development-ref.supabase.co",
  vercelProjectName: "contente-creators-dev",
};

describe("hosted deployment target", () => {
  it("keeps the exact client-owned project names", () => {
    expect(hostedDeploymentTargets).toEqual({
      development: {
        appEnv: "development",
        githubEnvironment: "contente-creators-dev",
        projectName: "contente-creators-dev",
      },
      production: {
        appEnv: "production",
        githubEnvironment: "contente-creators-prd",
        projectName: "contente-creators-prd",
      },
    });
  });

  it("accepts an isolated hosted development configuration", () => {
    expect(
      assertHostedDeploymentConfiguration(
        "development",
        developmentConfiguration,
      ),
    ).toMatchObject({
      appUrl: "https://dev.contentecreators.test",
      supabaseUrl: "https://development-ref.supabase.co",
    });
  });

  it.each([
    [
      "cross-environment Supabase project",
      { supabaseProjectName: "contente-creators-prd" },
    ],
    [
      "cross-environment Vercel project",
      { vercelProjectName: "contente-creators-prd" },
    ],
    ["wrong application environment", { appEnv: "production" }],
    ["public social proof enabled", { publicSocialProofEnabled: "true" }],
    ["non-TLS application origin", { appUrl: "http://dev.example.test" }],
    [
      "credential-bearing Supabase URL",
      { supabaseUrl: "https://user:secret@development-ref.supabase.co" },
    ],
    [
      "shared application and Supabase origin",
      {
        appUrl: "https://development-ref.supabase.co",
        supabaseUrl: "https://development-ref.supabase.co",
      },
    ],
  ])("rejects %s", (_label, override) => {
    expect(() =>
      assertHostedDeploymentConfiguration("development", {
        ...developmentConfiguration,
        ...override,
      }),
    ).toThrow();
  });

  it("rejects unknown deployment targets without echoing their value", () => {
    expect(() => parseHostedDeploymentTarget("secret-target")).toThrow(
      "Invalid deployment target",
    );
  });

  it("binds both database URLs to the selected Supabase project", () => {
    expect(() =>
      assertDatabaseConnectionTargets(
        "development-ref",
        "postgresql://postgres.development-ref:secret@aws-0-sa-east-1.pooler.supabase.com:6543/postgres",
        "postgresql://postgres:secret@db.development-ref.supabase.co:5432/postgres",
      ),
    ).not.toThrow();

    expect(() =>
      assertDatabaseConnectionTargets(
        "development-ref",
        "postgresql://postgres.production-ref:secret@aws-0-sa-east-1.pooler.supabase.com:6543/postgres",
        "postgresql://postgres:secret@db.development-ref.supabase.co:5432/postgres",
      ),
    ).toThrow("DATABASE_URL");
  });

  it("accepts only one-line Vercel deployment origins", () => {
    expect(
      assertVercelDeploymentUrl(
        "https://contente-creators-dev-abc123.vercel.app",
      ),
    ).toBe("https://contente-creators-dev-abc123.vercel.app");

    expect(() =>
      assertVercelDeploymentUrl(
        "https://contente-creators-dev.vercel.app/path?next=production",
      ),
    ).toThrow("Unsafe deployment URL");
  });

  it("requires the complete ordered migration ledger", () => {
    const expected = [
      { name: "core_schema", version: "20260723174000" },
      { name: "audit_revisions", version: "20260723180000" },
    ];

    expect(() => assertMigrationLedger(expected, expected)).not.toThrow();
    expect(() => assertMigrationLedger(expected, [expected.at(-1)!])).toThrow(
      "Hosted migration history",
    );
  });
});

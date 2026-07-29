import { describe, expect, it } from "vitest";

import { assertLocalAdminProvisioningTarget } from "./local-admin-target";

const localTarget = {
  appEnvironment: "local" as const,
  databaseUrl: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  supabaseUrl: "http://127.0.0.1:54321",
};

describe("local administrator provisioning target", () => {
  it("accepts only the local Supabase API and direct database ports", () => {
    expect(() => assertLocalAdminProvisioningTarget(localTarget)).not.toThrow();
  });

  it.each([
    {
      ...localTarget,
      appEnvironment: "development" as const,
    },
    {
      ...localTarget,
      databaseUrl:
        "postgresql://postgres:postgres@db.example.com:5432/postgres",
    },
    {
      ...localTarget,
      supabaseUrl: "https://project.supabase.co",
    },
  ])("rejects a non-local target", (target) => {
    expect(() => assertLocalAdminProvisioningTarget(target)).toThrowError(
      "Local administrator provisioning requires the local Supabase stack.",
    );
  });
});

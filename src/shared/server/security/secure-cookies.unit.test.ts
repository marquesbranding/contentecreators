import { afterEach, describe, expect, it, vi } from "vitest";

import { shouldUseSecureCookies } from "./secure-cookies";

describe("shouldUseSecureCookies", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("secures cookies on hosted production builds", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ENV", "production");
    expect(shouldUseSecureCookies()).toBe(true);
  });

  it("keeps local HTTP production builds usable", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ENV", "local");
    expect(shouldUseSecureCookies()).toBe(false);
  });

  it("does not secure cookies in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_ENV", "development");
    expect(shouldUseSecureCookies()).toBe(false);
  });
});

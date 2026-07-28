import { describe, expect, it } from "vitest";

import { createSecurityHeaders } from "./security-headers";

function toHeaderMap(headers: ReturnType<typeof createSecurityHeaders>) {
  return new Map(headers.map(({ key, value }) => [key, value]));
}

function directiveValue(policy: string, directive: string) {
  return policy
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${directive} `));
}

describe("security headers", () => {
  it("builds a restrictive production policy for hosted Supabase media and auth", () => {
    const headers = toHeaderMap(
      createSecurityHeaders({
        appEnvironment: "production",
        nodeEnvironment: "production",
        supabaseUrl: "https://contente-creators-prd.supabase.co",
      }),
    );
    const policy = headers.get("Content-Security-Policy") ?? "";

    expect(policy).not.toContain("*");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(directiveValue(policy, "default-src")).toBe("default-src 'self'");
    expect(directiveValue(policy, "connect-src")).toBe(
      "connect-src 'self' https://contente-creators-prd.supabase.co wss://contente-creators-prd.supabase.co",
    );
    expect(directiveValue(policy, "img-src")).toBe(
      "img-src 'self' blob: data: https://contente-creators-prd.supabase.co",
    );
    expect(directiveValue(policy, "media-src")).toBe(
      "media-src 'self' blob: https://contente-creators-prd.supabase.co",
    );
    expect(directiveValue(policy, "object-src")).toBe("object-src 'none'");
    expect(directiveValue(policy, "base-uri")).toBe("base-uri 'none'");
    expect(directiveValue(policy, "form-action")).toBe(
      "form-action 'self' https://contente-creators-prd.supabase.co https://accounts.google.com",
    );
    expect(directiveValue(policy, "frame-src")).toBe("frame-src 'none'");
    expect(directiveValue(policy, "frame-ancestors")).toBe(
      "frame-ancestors 'none'",
    );
    expect(policy).toContain("upgrade-insecure-requests");

    expect(headers.get("Strict-Transport-Security")).toBe("max-age=31536000");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
    expect(headers.get("Permissions-Policy")).toContain("microphone=()");
    expect(headers.get("Permissions-Policy")).toContain("geolocation=()");
  });

  it("allows the local Supabase HTTP and WebSocket origins without forcing HTTPS", () => {
    const headers = toHeaderMap(
      createSecurityHeaders({
        appEnvironment: "local",
        nodeEnvironment: "development",
        supabaseUrl: "http://127.0.0.1:54321",
      }),
    );
    const policy = headers.get("Content-Security-Policy") ?? "";

    expect(directiveValue(policy, "script-src")).toContain("'unsafe-eval'");
    expect(directiveValue(policy, "connect-src")).toBe(
      "connect-src 'self' http://127.0.0.1:54321 ws://127.0.0.1:54321",
    );
    expect(directiveValue(policy, "img-src")).toContain(
      "http://127.0.0.1:54321",
    );
    expect(directiveValue(policy, "form-action")).toBe(
      "form-action 'self' http://127.0.0.1:54321 https://accounts.google.com",
    );
    expect(policy).not.toContain("upgrade-insecure-requests");
    expect(headers.has("Strict-Transport-Security")).toBe(false);
  });

  it("does not admit an invalid configured external origin", () => {
    const headers = toHeaderMap(
      createSecurityHeaders({
        appEnvironment: "development",
        nodeEnvironment: "production",
        supabaseUrl: "javascript:alert(1)",
      }),
    );
    const policy = headers.get("Content-Security-Policy") ?? "";

    expect(directiveValue(policy, "connect-src")).toBe("connect-src 'self'");
    expect(directiveValue(policy, "form-action")).toBe(
      "form-action 'self' https://accounts.google.com",
    );
    expect(policy).not.toContain("javascript:");
    expect(headers.has("Strict-Transport-Security")).toBe(false);
  });
});

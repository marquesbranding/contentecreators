import { describe, expect, it } from "vitest";

import { verifySameOriginRequest } from "./same-origin-request";

describe("same-origin request verification", () => {
  it("accepts the request origin when it matches the forwarded host", () => {
    const request = new Request("https://internal.vercel.test/api/resource", {
      headers: {
        host: "internal.vercel.test",
        origin: "https://contente-creators-prd.vercel.app",
        "x-forwarded-host": "contente-creators-prd.vercel.app",
        "x-forwarded-proto": "https",
      },
      method: "POST",
    });

    expect(verifySameOriginRequest(request)).toEqual({ allowed: true });
  });

  it("accepts localhost HTTP without adding a hosted-origin exception", () => {
    const request = new Request("http://localhost:3000/api/resource", {
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000",
      },
      method: "PATCH",
    });

    expect(verifySameOriginRequest(request)).toEqual({ allowed: true });
  });

  it.each([
    ["missing origin", { host: "app.example.test" }],
    [
      "cross-site origin",
      { host: "app.example.test", origin: "https://attacker.example" },
    ],
    ["null origin", { host: "app.example.test", origin: "null" }],
    [
      "forwarded protocol mismatch",
      {
        host: "app.example.test",
        origin: "http://app.example.test",
        "x-forwarded-host": "app.example.test",
        "x-forwarded-proto": "https",
      },
    ],
  ])("rejects %s", (_label, headers) => {
    const request = new Request("https://app.example.test/api/resource", {
      headers,
      method: "POST",
    });

    expect(verifySameOriginRequest(request)).toEqual({
      allowed: false,
      reason: expect.any(String),
    });
  });

  it("does not enforce same-origin on safe methods", () => {
    const request = new Request("https://app.example.test/api/resource");

    expect(verifySameOriginRequest(request)).toEqual({ allowed: true });
  });
});

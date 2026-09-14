import { describe, expect, it } from "vitest";

import { toUserFacingError } from "./user-facing-error";

function authError(code: string, status = 400) {
  return Object.assign(new Error(code), {
    __isAuthError: true,
    code,
    name: "AuthApiError",
    status,
  });
}

function pgError(code: string, extra: Record<string, unknown> = {}) {
  return { cause: Object.assign(new Error("db error"), { code, ...extra }) };
}

describe("toUserFacingError", () => {
  it("maps rate-limited auth errors as retryable", () => {
    const result = toUserFacingError(
      authError("over_email_send_rate_limit", 429),
      { operation: "sign_up" },
    );

    expect(result.code).toBe("auth.rate_limited");
    expect(result.retryable).toBe(true);
  });

  it("maps weak password with a field error", () => {
    const result = toUserFacingError(authError("weak_password"), {
      operation: "sign_up",
    });

    expect(result.code).toBe("auth.weak_password");
    expect(result.fieldErrors?.password).toBeDefined();
  });

  it("maps expired/invalid otp as retryable", () => {
    const result = toUserFacingError(authError("otp_expired"), {
      operation: "verify_code",
    });

    expect(result.code).toBe("auth.invalid_otp");
    expect(result.retryable).toBe(true);
  });

  it("maps user_already_exists", () => {
    const result = toUserFacingError(authError("user_already_exists"), {
      operation: "sign_up",
    });

    expect(result.code).toBe("auth.user_already_exists");
  });

  it("maps a unique cnpj violation to a field error", () => {
    const result = toUserFacingError(
      pgError("23505", { constraint_name: "company_profiles_cnpj_uidx" }),
      { operation: "save_profile" },
    );

    expect(result.code).toBe("db.unique.cnpj");
    expect(result.fieldErrors?.cnpj).toBeDefined();
  });

  it("maps a generic unique violation without a known field", () => {
    const result = toUserFacingError(pgError("23505"), {
      operation: "save_profile",
    });

    expect(result.code).toBe("db.unique_violation");
  });

  it("maps permission_denied", () => {
    const result = toUserFacingError(pgError("42501"), {
      operation: "save_profile",
    });

    expect(result.code).toBe("db.permission_denied");
  });

  it("maps serialization conflicts as retryable", () => {
    const result = toUserFacingError(pgError("40001"), {
      operation: "save_profile",
    });

    expect(result.code).toBe("db.serialization_conflict");
    expect(result.retryable).toBe(true);
  });

  it("maps connection-exception class codes as db.unavailable", () => {
    const result = toUserFacingError(pgError("08006"), {
      operation: "save_profile",
    });

    expect(result.code).toBe("db.unavailable");
    expect(result.retryable).toBe(true);
  });

  it("maps a fetch TypeError as a network error", () => {
    const result = toUserFacingError(new TypeError("Failed to fetch"), {
      operation: "save_profile",
    });

    expect(result.code).toBe("network.offline");
    expect(result.retryable).toBe(true);
  });

  it("maps a 413 payload error", () => {
    const result = toUserFacingError({ status: 413 }, { operation: "upload_media" });

    expect(result.code).toBe("payload.too_large");
  });

  it("maps a 504 gateway timeout as retryable", () => {
    const result = toUserFacingError({ status: 504 }, { operation: "save_profile" });

    expect(result.code).toBe("gateway.timeout");
    expect(result.retryable).toBe(true);
  });

  it("falls back to a generic message with a short request id", () => {
    const result = toUserFacingError(new Error("totally unknown"), {
      operation: "save_profile",
      requestId: "abcdef12-3456-7890-abcd-ef1234567890",
    });

    expect(result.code).toBe("unknown");
    expect(result.message).toContain("abcdef12");
    expect(result.retryable).toBe(true);
  });

  it("falls back without a code when no request id is given", () => {
    const result = toUserFacingError(new Error("totally unknown"), {
      operation: "moderation",
    });

    expect(result.code).toBe("unknown");
    expect(result.message).not.toContain("Código");
  });
});

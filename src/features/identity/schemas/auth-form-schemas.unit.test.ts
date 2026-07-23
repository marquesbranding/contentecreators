import { describe, expect, it } from "vitest";

import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signUpSchema,
} from "./auth-form-schemas";

describe("identity auth form schemas", () => {
  it("normalizes a valid login without retaining unrelated fields", () => {
    expect(
      loginSchema.parse({
        email: "  PESSOA@EXAMPLE.COM ",
        password: "SenhaSegura123",
        nextPath: "/app",
        role: "ADMIN",
      }),
    ).toEqual({
      email: "pessoa@example.com",
      password: "SenhaSegura123",
      nextPath: "/app",
    });
  });

  it.each([
    ["short", "Senha1"],
    ["uppercase", "senhasegura1"],
    ["lowercase", "SENHASEGURA1"],
    ["number", "SenhaSegura"],
  ])("rejects a password missing the %s requirement", (_case, password) => {
    const result = signUpSchema.safeParse({
      email: "pessoa@example.com",
      password,
      passwordConfirmation: password,
    });

    expect(result.success).toBe(false);
  });

  it("rejects a mismatched password confirmation", () => {
    const result = signUpSchema.safeParse({
      email: "pessoa@example.com",
      password: "SenhaSegura123",
      passwordConfirmation: "OutraSenha123",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.passwordConfirmation).toContain(
      "As senhas não coincidem.",
    );
  });

  it("accepts only the public registration intents", () => {
    expect(
      signUpSchema.parse({
        email: "pessoa@example.com",
        intent: "COMPANY",
        password: "SenhaSegura123",
        passwordConfirmation: "SenhaSegura123",
      }).intent,
    ).toBe("COMPANY");

    expect(
      signUpSchema.safeParse({
        email: "admin@example.com",
        intent: "ADMIN",
        password: "SenhaSegura123",
        passwordConfirmation: "SenhaSegura123",
      }).success,
    ).toBe(false);
  });

  it("validates recovery email and reset password with the same policy", () => {
    expect(
      forgotPasswordSchema.parse({ email: " PESSOA@EXAMPLE.COM " }),
    ).toEqual({ email: "pessoa@example.com" });
    expect(
      resetPasswordSchema.safeParse({
        password: "fraca",
        passwordConfirmation: "fraca",
      }).success,
    ).toBe(false);
  });
});

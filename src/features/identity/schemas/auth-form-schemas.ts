import { z } from "zod";

const requiredText = z.preprocess(
  (value) => (typeof value === "string" ? value : ""),
  z.string(),
);

const normalizedEmail = requiredText
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.email({ error: "Informe um e-mail válido." }));

const password = requiredText
  .pipe(z.string().min(8, "A senha deve ter pelo menos 8 caracteres."))
  .refine((value) => /[a-z]/u.test(value), {
    message: "A senha deve ter pelo menos uma letra minúscula.",
  })
  .refine((value) => /[A-Z]/u.test(value), {
    message: "A senha deve ter pelo menos uma letra maiúscula.",
  })
  .refine((value) => /\d/u.test(value), {
    message: "A senha deve ter pelo menos um número.",
  });

const optionalText = z.preprocess(
  (value) =>
    typeof value === "string" && value.length > 0 ? value : undefined,
  z.string().optional(),
);

export const loginSchema = z.object({
  email: normalizedEmail,
  password: requiredText.pipe(z.string().min(1, "Informe sua senha.")),
  nextPath: optionalText,
});

export const signUpSchema = z
  .object({
    email: normalizedEmail,
    intent: z
      .preprocess(
        (value) =>
          typeof value === "string" ? value.trim().toUpperCase() : undefined,
        z.enum(["INFLUENCER", "COMPANY"]).optional(),
      )
      .optional(),
    password,
    passwordConfirmation: requiredText,
  })
  .superRefine((value, context) => {
    if (value.password !== value.passwordConfirmation) {
      context.addIssue({
        code: "custom",
        message: "As senhas não coincidem.",
        path: ["passwordConfirmation"],
      });
    }
  });

export const forgotPasswordSchema = z.object({
  email: normalizedEmail,
});

export const resetPasswordSchema = z
  .object({
    password,
    passwordConfirmation: requiredText,
  })
  .superRefine((value, context) => {
    if (value.password !== value.passwordConfirmation) {
      context.addIssue({
        code: "custom",
        message: "As senhas não coincidem.",
        path: ["passwordConfirmation"],
      });
    }
  });

export const resendConfirmationSchema = z.object({
  email: normalizedEmail,
  intent: z.preprocess(
    (value) =>
      typeof value === "string" ? value.trim().toUpperCase() : undefined,
    z.enum(["INFLUENCER", "COMPANY"]).optional(),
  ),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

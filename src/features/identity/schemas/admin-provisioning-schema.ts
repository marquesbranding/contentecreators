import { z } from "zod";

export const adminEmailSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.email({ error: "Informe um e-mail válido." }));

export const adminProvisioningReasonSchema = z
  .string()
  .trim()
  .min(3, "Informe o motivo do provisionamento.")
  .max(500, "O motivo deve ter no máximo 500 caracteres.");

export const adminProvisioningSchema = z.object({
  email: adminEmailSchema,
  reason: adminProvisioningReasonSchema,
});

export const initialAdminApprovalReferenceSchema = z
  .string()
  .trim()
  .min(3)
  .max(120);

export const initialAdminBootstrapSchema = z.object({
  approvalReference: initialAdminApprovalReferenceSchema,
  email: adminEmailSchema,
});

import "server-only";

import { z } from "zod";

import {
  adminEmailSchema,
  initialAdminApprovalReferenceSchema,
} from "../../schemas/admin-provisioning-schema";
import type {
  AdminIdentity,
  AdminProvisioningOutcome,
} from "./admin-provisioning.service";

const productionAdminPasswordSchema = z.string().min(12).max(128);
const requestIdPrefixSchema = z.string().trim().min(1).max(120);
const productionAdminSchema = z.object({
  approvalReference: initialAdminApprovalReferenceSchema,
  email: adminEmailSchema,
});
const productionAdminsSchema = z
  .array(productionAdminSchema)
  .min(1)
  .max(10)
  .superRefine((admins, context) => {
    const normalizedEmails = admins.map((admin) => admin.email.toLowerCase());

    if (new Set(normalizedEmails).size !== normalizedEmails.length) {
      context.addIssue({
        code: "custom",
        message: "Production administrator emails must be unique.",
      });
    }
  });

export interface PreparedPasswordIdentity {
  identity: AdminIdentity;
  passwordSeeded: boolean;
}

export interface ProductionAdminBootstrapDependencies {
  bootstrapApprovedAdmin(input: {
    approvalReference: string;
    email: string;
    identityId: string;
    requestId: string;
  }): Promise<AdminProvisioningOutcome>;
  findIdentityByEmail(email: string): Promise<AdminIdentity | null>;
  preparePasswordIdentity(input: {
    email: string;
    existingIdentity: AdminIdentity | null;
    password: string;
  }): Promise<PreparedPasswordIdentity | null>;
  seedExistingPassword(input: {
    identity: AdminIdentity;
    password: string;
  }): Promise<AdminIdentity | null>;
}

export function createProductionAdminBootstrapService(
  dependencies: ProductionAdminBootstrapDependencies,
) {
  return {
    async bootstrap(input: {
      admins: ReadonlyArray<{
        approvalReference: string;
        email: string;
      }>;
      password: string;
      requestIdPrefix: string;
    }) {
      const configuration = z
        .object({
          admins: productionAdminsSchema,
          password: productionAdminPasswordSchema,
          requestIdPrefix: requestIdPrefixSchema,
        })
        .safeParse(input);

      if (!configuration.success) {
        throw new Error("Invalid production administrator configuration.");
      }

      const outcomes: Array<"already_provisioned" | "provisioned"> = [];

      for (const [index, admin] of configuration.data.admins.entries()) {
        const entryNumber = index + 1;
        const existingIdentity = await dependencies.findIdentityByEmail(
          admin.email,
        );
        const preparedIdentity = await dependencies.preparePasswordIdentity({
          email: admin.email,
          existingIdentity,
          password: configuration.data.password,
        });

        if (!preparedIdentity) {
          throw new Error(
            `Production administrator bootstrap failed at entry ${entryNumber}: IDENTITY_SETUP_FAILED`,
          );
        }

        const outcome = await dependencies.bootstrapApprovedAdmin({
          approvalReference: admin.approvalReference,
          email: admin.email,
          identityId: preparedIdentity.identity.id,
          requestId: `${configuration.data.requestIdPrefix}-${entryNumber}`,
        });

        if (outcome.kind === "rejected") {
          throw new Error(
            `Production administrator bootstrap failed at entry ${entryNumber}: ${outcome.code}`,
          );
        }

        if (!preparedIdentity.passwordSeeded) {
          const seededIdentity = await dependencies.seedExistingPassword({
            identity: preparedIdentity.identity,
            password: configuration.data.password,
          });

          if (!seededIdentity) {
            throw new Error(
              `Production administrator bootstrap failed at entry ${entryNumber}: PASSWORD_SETUP_FAILED`,
            );
          }
        }

        outcomes.push(outcome.kind);
      }

      return {
        count: outcomes.length,
        kind: "completed" as const,
        outcomes,
      };
    },
  };
}

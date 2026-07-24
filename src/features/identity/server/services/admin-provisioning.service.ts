import "server-only";

import {
  adminEmailSchema,
  adminProvisioningReasonSchema,
  initialAdminApprovalReferenceSchema,
} from "../../schemas/admin-provisioning-schema";
import type { CurrentSessionDto } from "../../types/current-account.types";
import {
  AccountAccessError,
  requireAdmin,
  requireAccount,
} from "../policies/account-access.guards";

export interface AdminIdentity {
  email: string;
  id: string;
}

export type AdminProvisioningOutcome =
  | {
      accountId: string;
      kind: "already_provisioned" | "provisioned";
    }
  | {
      code:
        "ADMIN_CONFLICT" | "ADMIN_REQUIRED" | "INITIAL_ADMIN_ALREADY_EXISTS";
      kind: "rejected";
    };

export interface AdminProvisioningDependencies {
  bootstrapInitialAdmin(input: {
    approvalReference: string;
    email: string;
    identityId: string;
    requestId: string;
  }): Promise<AdminProvisioningOutcome>;
  findIdentityByEmail(email: string): Promise<AdminIdentity | null>;
  inspectInitialAdmin(
    identityId: string | null,
  ): Promise<
    { kind: "available" } | { kind: "already_provisioned" | "conflict" }
  >;
  inviteIdentity(email: string): Promise<AdminIdentity | null>;
  provisionAdditionalAdmin(input: {
    email: string;
    identityId: string;
    reason: string;
    requestId: string;
  }): Promise<AdminProvisioningOutcome>;
  resolveCurrentSession(requestId: string): Promise<CurrentSessionDto>;
}

type AdminProvisioningRejectionCode =
  | "ADMIN_REQUIRED"
  | "APPROVAL_REFERENCE_REQUIRED"
  | "EMAIL_INVALID"
  | "IDENTITY_INVITE_FAILED"
  | "REASON_REQUIRED";

function rejection(code: AdminProvisioningRejectionCode) {
  return {
    code,
    kind: "rejected" as const,
  };
}

async function resolveOrInviteIdentity(
  dependencies: AdminProvisioningDependencies,
  email: string,
) {
  const existingIdentity = await dependencies.findIdentityByEmail(email);

  return existingIdentity ?? dependencies.inviteIdentity(email);
}

export function createAdminProvisioningService(
  dependencies: AdminProvisioningDependencies,
) {
  return {
    async bootstrapInitial(input: {
      approvalReference: string;
      email: string;
      mode: "DRY_RUN" | "EXECUTE";
      requestId: string;
    }) {
      const email = adminEmailSchema.safeParse(input.email);

      if (!email.success) {
        return rejection("EMAIL_INVALID");
      }

      const approvalReference = initialAdminApprovalReferenceSchema.safeParse(
        input.approvalReference,
      );

      if (!approvalReference.success) {
        return rejection("APPROVAL_REFERENCE_REQUIRED");
      }

      const existingIdentity = await dependencies.findIdentityByEmail(
        email.data,
      );

      if (input.mode === "DRY_RUN") {
        const state = await dependencies.inspectInitialAdmin(
          existingIdentity?.id ?? null,
        );

        return {
          identityExists: Boolean(existingIdentity),
          kind: "planned" as const,
          state:
            state.kind === "already_provisioned"
              ? ("already_provisioned" as const)
              : state.kind === "conflict"
                ? ("conflict" as const)
                : ("available" as const),
        };
      }

      const identity =
        existingIdentity ?? (await dependencies.inviteIdentity(email.data));

      if (!identity) {
        return rejection("IDENTITY_INVITE_FAILED");
      }

      return dependencies.bootstrapInitialAdmin({
        approvalReference: approvalReference.data,
        email: email.data,
        identityId: identity.id,
        requestId: input.requestId,
      });
    },

    async provisionAdditional(input: {
      email: string;
      reason: string;
      requestId: string;
    }) {
      const email = adminEmailSchema.safeParse(input.email);

      if (!email.success) {
        return rejection("EMAIL_INVALID");
      }

      const reason = adminProvisioningReasonSchema.safeParse(input.reason);

      if (!reason.success) {
        return rejection("REASON_REQUIRED");
      }

      try {
        const session = await dependencies.resolveCurrentSession(
          input.requestId,
        );
        requireAdmin(requireAccount(session));
      } catch (error) {
        if (error instanceof AccountAccessError) {
          return rejection("ADMIN_REQUIRED");
        }

        throw error;
      }

      const identity = await resolveOrInviteIdentity(dependencies, email.data);

      if (!identity) {
        return rejection("IDENTITY_INVITE_FAILED");
      }

      return dependencies.provisionAdditionalAdmin({
        email: email.data,
        identityId: identity.id,
        reason: reason.data,
        requestId: input.requestId,
      });
    },
  };
}

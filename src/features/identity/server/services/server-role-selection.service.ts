import "server-only";

import { createDrizzleRoleSelectionRepository } from "../repositories/drizzle-role-selection.repository";
import { createRoleSelectionService } from "./role-selection.service";
import { createServerIdentityAuthService } from "./server-identity-auth.service";

export async function createServerRoleSelectionService() {
  const authService = await createServerIdentityAuthService();
  const roleService = createRoleSelectionService(
    createDrizzleRoleSelectionRepository(),
  );

  return {
    async getEntryDecision() {
      const identity = await authService.requireVerifiedIdentity();

      if (identity.kind === "failure") {
        return {
          destination:
            identity.code === "authentication_required"
              ? "/login?next=%2Fonboarding%2Frole"
              : "/confirm-email",
          kind: "redirect" as const,
        };
      }

      return roleService.getEntryDecision(identity.identityId);
    },

    async selectRole(input: {
      requestId: string;
      role: "INFLUENCER" | "COMPANY";
    }) {
      const identity = await authService.requireVerifiedIdentity();

      if (identity.kind === "failure") {
        return {
          destination:
            identity.code === "authentication_required"
              ? "/login?next=%2Fonboarding%2Frole"
              : "/confirm-email",
          kind: "authentication_redirect" as const,
        };
      }

      return roleService.selectRole({
        email: identity.email,
        identityId: identity.identityId,
        requestId: input.requestId,
        role: input.role,
      });
    },
  };
}

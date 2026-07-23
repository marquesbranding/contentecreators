import "server-only";

import { getAccountDestination } from "../../domain/account-route-decision";
import type { RegistrationIntent } from "../../types/auth.types";
import type { IdentityAccountSummary } from "../../types/role-selection.types";

interface SelectInitialRoleInput {
  email: string;
  identityId: string;
  requestId: string;
  role: RegistrationIntent;
}

type RoleSelectionRepositoryResult =
  | {
      account: IdentityAccountSummary;
      kind: "selected" | "already_selected";
    }
  | {
      account: IdentityAccountSummary;
      kind: "conflict";
    };

export interface RoleSelectionRepository {
  findByIdentityId(identityId: string): Promise<IdentityAccountSummary | null>;
  selectInitialRole(
    input: SelectInitialRoleInput,
  ): Promise<RoleSelectionRepositoryResult>;
}

export type { IdentityAccountSummary };

export const IMMUTABLE_ROLE_MESSAGE =
  "O tipo de perfil já foi confirmado e não pode ser alterado por este acesso.";

export function createRoleSelectionService(
  repository: RoleSelectionRepository,
) {
  return {
    async getEntryDecision(identityId: string) {
      const account = await repository.findByIdentityId(identityId);

      if (!account?.role) {
        return { kind: "ready" as const };
      }

      return {
        destination: getAccountDestination(account),
        kind: "redirect" as const,
      };
    },

    async selectRole(input: SelectInitialRoleInput) {
      const result = await repository.selectInitialRole(input);
      const destination = getAccountDestination(result.account);

      if (result.kind === "conflict") {
        return {
          destination,
          kind: "immutable_role" as const,
          message: IMMUTABLE_ROLE_MESSAGE,
        };
      }

      return {
        destination,
        kind: "redirect" as const,
      };
    },
  };
}

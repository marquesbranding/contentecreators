import "server-only";

import type { CurrentAccountDto } from "../../types/current-account.types";
import type { VerifiedAccountContext } from "../services/verified-account-transaction";

export function toCurrentAccountDto(
  context: VerifiedAccountContext,
): CurrentAccountDto {
  return {
    id: context.accountId,
    role: context.role,
    status: context.status,
  };
}

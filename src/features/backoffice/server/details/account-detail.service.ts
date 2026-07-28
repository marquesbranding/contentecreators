import "server-only";

import {
  accountDetailQuerySchema,
  type AccountDetailQuery,
} from "../../schemas/account-detail.schema";
import type { BackofficeAccountDetailDto } from "../../types/account-detail.types";

export interface AccountDetailRepository {
  findByAccountId(
    query: AccountDetailQuery,
  ): Promise<BackofficeAccountDetailDto | null>;
}

export function createAccountDetailService({
  repository,
}: {
  repository: AccountDetailRepository;
}) {
  return {
    async load(input: AccountDetailQuery) {
      return repository.findByAccountId(accountDetailQuerySchema.parse(input));
    },
  };
}

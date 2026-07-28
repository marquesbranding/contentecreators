import "server-only";

import { createServerAccountDetailService } from "./server-account-detail.service";

export async function loadBackofficeAccountDetail(accountId: string) {
  const service = await createServerAccountDetailService();

  return service.load({
    accountId,
    requestId: crypto.randomUUID(),
  });
}

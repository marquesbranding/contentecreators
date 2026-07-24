import "server-only";

import { createServerCompanyProfileService } from "../services/server-company-profile.service";

export async function loadCurrentCompanyProfile() {
  const service = await createServerCompanyProfileService();

  return service.loadOwnerProfile({
    requestId: crypto.randomUUID(),
  });
}

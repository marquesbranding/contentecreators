import "server-only";

import { createServerInfluencerProfileService } from "../services/server-influencer-profile.service";

export async function loadCurrentInfluencerProfile() {
  const service = await createServerInfluencerProfileService();

  return service.loadOwnerProfile({
    requestId: crypto.randomUUID(),
  });
}

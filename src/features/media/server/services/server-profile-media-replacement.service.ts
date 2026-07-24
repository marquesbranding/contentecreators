import "server-only";

import { resolveFreshServerCurrentSession } from "@/features/identity/server";

import { createServerProfileMediaReplacementRepository } from "../repositories/drizzle-profile-media-replacement.repository";
import { createProfileMediaReplacementService } from "./profile-media-replacement.service";

export async function createServerProfileMediaReplacementService() {
  return createProfileMediaReplacementService({
    repository: await createServerProfileMediaReplacementRepository(),
    resolveCurrentSession: resolveFreshServerCurrentSession,
  });
}

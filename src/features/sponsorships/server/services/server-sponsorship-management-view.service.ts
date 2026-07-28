import "server-only";

import { getServerSignedMedia } from "@/features/media/server";

import { createServerAdminSponsorshipPlacementService } from "./server-admin-sponsorship-placement.service";
import { createSponsorshipManagementViewService } from "./sponsorship-management-view.service";

export async function createServerSponsorshipManagementViewService() {
  return createSponsorshipManagementViewService({
    adminService: await createServerAdminSponsorshipPlacementService(),
    getSignedMedia: getServerSignedMedia,
    now: () => new Date(),
  });
}

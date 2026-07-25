import type { PgTable } from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import {
  accountConsents,
  accountContactPreferences,
  auditRevisions,
  blockedIdentities,
  identityAuthEffects,
  legalDocuments,
} from "./compliance";
import { emailAttempts, emailOutbox } from "./communications";
import { mediaAssets } from "./media";
import { moderationCases, moderationEvents } from "./moderation";
import {
  companyLocations,
  companyProfiles,
  creatorMetricSnapshots,
  creatorNiches,
  creatorProfiles,
  niches,
  socialProfiles,
} from "./profiles";
import { sponsorshipPlacements } from "./sponsorships";

export const applicationTables = [
  accountConsents,
  accountContactPreferences,
  accounts,
  auditRevisions,
  blockedIdentities,
  identityAuthEffects,
  companyLocations,
  companyProfiles,
  creatorMetricSnapshots,
  creatorNiches,
  creatorProfiles,
  emailAttempts,
  emailOutbox,
  legalDocuments,
  mediaAssets,
  moderationCases,
  moderationEvents,
  niches,
  socialProfiles,
  sponsorshipPlacements,
] satisfies PgTable[];

import type { Metadata } from "next";

import {
  parseSponsorshipManagementSearchParams,
  SponsorshipManagementScreen,
} from "@/features/sponsorships";
import {
  activateProfileMediaAction,
  finalizeMediaUploadAction,
  prepareMediaUploadAction,
} from "@/features/media/server";

export const metadata: Metadata = {
  title: "Patrocínios",
};

type SponsorshipPageSearchParams = Record<
  string,
  string | string[] | undefined
>;

function toUrlSearchParams(searchParams: SponsorshipPageSearchParams) {
  const result = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      result.set(key, value);
    } else if (Array.isArray(value) && value[0]) {
      result.set(key, value[0]);
    }
  }

  return result;
}

export default async function BackofficeSponsorshipsPage({
  searchParams,
}: {
  searchParams: Promise<SponsorshipPageSearchParams>;
}) {
  const filters = parseSponsorshipManagementSearchParams(
    toUrlSearchParams(await searchParams),
  );

  return (
    <SponsorshipManagementScreen
      filters={filters}
      mediaActions={{
        activate: activateProfileMediaAction,
        finalize: finalizeMediaUploadAction,
        prepare: prepareMediaUploadAction,
      }}
    />
  );
}

import { MarketingLanding } from "@/features/marketing";
import { PublicAggregateCountersEnhancement } from "@/features/marketing/client";
import { loadPublicSupportContact } from "@/features/marketing/server";
import { PublicSponsorshipPromotionEnhancement } from "@/features/sponsorships/client";

export const dynamic = "error";

export default function Home() {
  const supportContactEmail = loadPublicSupportContact();

  return (
    <MarketingLanding
      aggregateCountersSlot={<PublicAggregateCountersEnhancement />}
      publicPromotion={<PublicSponsorshipPromotionEnhancement />}
      supportContactEmail={supportContactEmail}
    />
  );
}

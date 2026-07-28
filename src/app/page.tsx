import { MarketingLanding } from "@/features/marketing";
import {
  loadPublicSupportContact,
  PublicAggregateCountersSlot,
} from "@/features/marketing/server";
import { PublicSponsorshipPromotionSlot } from "@/features/sponsorships/server";

export default function Home() {
  const supportContactEmail = loadPublicSupportContact();

  return (
    <MarketingLanding
      aggregateCountersSlot={<PublicAggregateCountersSlot />}
      publicPromotion={<PublicSponsorshipPromotionSlot />}
      supportContactEmail={supportContactEmail}
    />
  );
}

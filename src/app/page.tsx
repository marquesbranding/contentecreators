import { MarketingLanding } from "@/features/marketing";
import { PublicCommunityProofEnhancement } from "@/features/marketing/client";
import { loadPublicSupportContact } from "@/features/marketing/server";
import { PublicSponsorshipPromotionEnhancement } from "@/features/sponsorships/client";

export const dynamic = "error";

export default function Home() {
  const supportContactEmail = loadPublicSupportContact();

  return (
    <MarketingLanding
      publicCommunityProof={<PublicCommunityProofEnhancement />}
      publicPromotion={<PublicSponsorshipPromotionEnhancement />}
      supportContactEmail={supportContactEmail}
    />
  );
}

import { MarketingLanding } from "@/features/marketing";
import { loadPublicSupportContact } from "@/features/marketing/server";

export const dynamic = "error";

export default function Home() {
  const supportContactEmail = loadPublicSupportContact();

  return <MarketingLanding supportContactEmail={supportContactEmail} />;
}

import { sponsorshipAccessibleName } from "../domain/sponsorship-appearance";
import { SponsorshipCatalogCard } from "./sponsorship-catalog-card";
import {
  isSponsorshipCreativeVisible,
  type SponsorshipCreativeViewModel,
} from "./sponsorship-presentation";
export function SponsorshipSidePlacement({
  creative,
}: {
  creative: SponsorshipCreativeViewModel;
}) {
  if (!isSponsorshipCreativeVisible(creative)) return null;
  return (
    <aside
      aria-label={`Patrocínio lateral: ${sponsorshipAccessibleName(creative)}`}
      className="w-full min-w-0 lg:sticky lg:top-5 lg:w-72 lg:self-start"
      data-mobile-presentation="inline"
    >
      <SponsorshipCatalogCard creative={creative} />
    </aside>
  );
}

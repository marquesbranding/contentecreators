import { cn } from "@/shared/lib/cn";
import { sponsorshipFontVariables } from "../domain/sponsorship-fonts";
import {
  sponsorshipAccessibleName,
  toAppearanceStyle,
} from "../domain/sponsorship-appearance";
import {
  isSponsorshipCreativeVisible,
  SponsorshipCreativeLink,
  SponsorshipExternalLink,
  SponsorshipLabels,
  SponsorshipMedia,
  type SponsorshipCreativeViewModel,
} from "./sponsorship-presentation";

export function SponsorshipCatalogCard({
  creative,
}: {
  creative: SponsorshipCreativeViewModel;
}) {
  if (!isSponsorshipCreativeVisible(creative)) return null;
  const hasCopy = Boolean(
    creative.title || creative.body || creative.link?.buttonLabel,
  );
  return (
    <article
      aria-label={sponsorshipAccessibleName(creative)}
      data-slot="sponsorship-catalog-card"
      className={cn(
        "bg-card border-border relative isolate flex h-full min-h-80 min-w-0 flex-col overflow-hidden rounded-2xl border shadow-sm",
        sponsorshipFontVariables,
      )}
      style={toAppearanceStyle(creative.appearance)}
    >
      <SponsorshipCreativeLink creative={creative} />
      {creative.media ? (
        <div
          className={hasCopy ? "relative min-h-24 flex-1" : "absolute inset-0"}
        >
          <SponsorshipMedia
            className="absolute inset-0 h-full"
            media={creative.media}
            mediaMobile={creative.mediaMobile}
            mediaTablet={creative.mediaTablet}
          />
        </div>
      ) : null}
      <div className={cn("relative space-y-2 p-4", !hasCopy && "mt-auto")}>
        <SponsorshipLabels {...creative} />
        {creative.title ? (
          <h3 className="line-clamp-2 text-base leading-snug font-bold">
            {creative.title}
          </h3>
        ) : null}
        {creative.body ? (
          <p
            style={toAppearanceStyle(creative.appearance)}
            className="text-muted-foreground line-clamp-2 text-sm leading-5"
          >
            {creative.body}
          </p>
        ) : null}
        {creative.link?.buttonLabel ? (
          <SponsorshipExternalLink
            appearance={creative.appearance}
            className="w-full min-w-0 whitespace-normal"
            link={creative.link}
          />
        ) : null}
      </div>
    </article>
  );
}

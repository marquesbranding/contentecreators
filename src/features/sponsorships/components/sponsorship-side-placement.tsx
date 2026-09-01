import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

import {
  isSponsorshipCreativeVisible,
  type SponsorshipCreativeViewModel,
  SponsorshipExternalLink,
  SponsorshipLabels,
  SponsorshipMedia,
} from "./sponsorship-presentation";

export function SponsorshipSidePlacement({
  creative,
}: {
  creative: SponsorshipCreativeViewModel;
}) {
  if (!isSponsorshipCreativeVisible(creative)) {
    return null;
  }

  return (
    <aside
      aria-label={`Patrocínio lateral: ${creative.title}`}
      className="w-full min-w-0 lg:sticky lg:top-5 lg:w-72 lg:self-start"
      data-mobile-presentation="inline"
    >
      <Card className="gap-0 overflow-hidden rounded-2xl border bg-white py-0 shadow-sm">
        {creative.media ? (
          <SponsorshipMedia
            className="aspect-[16/8] border-b lg:aspect-[4/3]"
            media={creative.media}
            mediaMobile={creative.mediaMobile}
            mediaTablet={creative.mediaTablet}
          />
        ) : null}
        <CardHeader className="gap-3 px-5 pt-5">
          <SponsorshipLabels
            advertiserLabel={creative.advertiserLabel}
            previewMode={creative.previewMode}
          />
          <CardTitle>
            <h2 className="text-xl font-bold tracking-[-0.02em]">
              {creative.title}
            </h2>
          </CardTitle>
          {creative.body ? (
            <CardDescription className="leading-6">
              {creative.body}
            </CardDescription>
          ) : null}
        </CardHeader>
        {creative.link ? (
          <CardContent className="px-5 pb-5">
            <SponsorshipExternalLink className="w-full" link={creative.link} />
          </CardContent>
        ) : null}
      </Card>
    </aside>
  );
}

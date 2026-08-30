import { Camera, MapPin, UsersRound } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/cn";

/** A short-lived bearer URL intentionally bypasses the shared image optimizer. */
function PrivateImage({
  alt,
  className,
  src,
}: {
  alt: string;
  className: string;
  src: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className={className}
      decoding="async"
      loading="eager"
      referrerPolicy="no-referrer"
      src={src}
    />
  );
}

export interface ProfileHeaderPreviewBadge {
  label: string;
  tone: "neutral" | "primary";
}

export function ProfileHeaderPreview({
  avatarUrl,
  badges,
  coverUrl,
  displayName,
  initials,
  location,
  onAvatarClick,
  onCoverClick,
}: {
  avatarUrl: string | null;
  badges: ProfileHeaderPreviewBadge[];
  coverUrl: string | null;
  displayName: string;
  initials: string;
  location: string;
  /** When provided, the cover becomes a clickable upload target (hover overlay + camera badge). */
  onAvatarClick?: () => void;
  onCoverClick?: () => void;
}) {
  return (
    <Card className="gap-0 overflow-hidden rounded-3xl py-0">
      <div
        className={cn("group relative", onCoverClick && "cursor-pointer")}
        onClick={onCoverClick}
        role={onCoverClick ? "button" : undefined}
        tabIndex={onCoverClick ? 0 : undefined}
      >
        {coverUrl ? (
          <PrivateImage
            alt=""
            className="h-36 w-full object-cover sm:h-44"
            src={coverUrl}
          />
        ) : (
          <div
            aria-hidden="true"
            className="from-brand-blue/30 via-brand-pink/15 to-brand-lime/25 h-36 bg-gradient-to-br sm:h-44"
          />
        )}
        {onCoverClick ? (
          <>
            <div className="absolute inset-0 hidden items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100 sm:flex">
              <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black">
                <Camera aria-hidden="true" className="size-3.5" />
                {coverUrl ? "Alterar capa" : "Adicionar capa"}
              </span>
            </div>
            <span className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-black shadow-sm backdrop-blur-sm">
              <Camera aria-hidden="true" className="size-3.5" />
              {coverUrl
                ? "Alterar capa"
                : "Toque ou clique para adicionar uma capa"}
            </span>
          </>
        ) : null}
      </div>
      <CardHeader className="relative gap-3 px-5 pt-12 pb-5 sm:px-8 sm:pt-14">
        <div
          className={cn(
            "group/avatar absolute -top-9 left-5 size-18 sm:-top-10 sm:left-8 sm:size-20",
            onAvatarClick && "cursor-pointer",
          )}
          onClick={onAvatarClick}
          role={onAvatarClick ? "button" : undefined}
          tabIndex={onAvatarClick ? 0 : undefined}
        >
          <div className="size-full overflow-hidden rounded-3xl border-4 border-white bg-white shadow-lg">
            {avatarUrl ? (
              <PrivateImage alt="" className="size-full object-cover" src={avatarUrl} />
            ) : initials ? (
              <div className="from-brand-blue to-brand-royal flex size-full items-center justify-center bg-gradient-to-br text-lg font-extrabold tracking-wide text-white">
                {initials}
              </div>
            ) : (
              <div className="bg-muted flex size-full items-center justify-center">
                <UsersRound aria-hidden="true" className="text-muted-foreground size-8" />
              </div>
            )}
            {onAvatarClick ? (
              <div className="absolute inset-0 hidden items-center justify-center bg-black/40 opacity-0 transition group-hover/avatar:opacity-100 sm:flex">
                <Camera aria-hidden="true" className="size-5 text-white" />
              </div>
            ) : null}
          </div>
          {onAvatarClick ? (
            <span className="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full border-2 border-white bg-brand-blue text-white shadow-sm">
              <Camera aria-hidden="true" className="size-3.5" />
            </span>
          ) : null}
        </div>

        <CardTitle className="text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">
          {displayName}
        </CardTitle>

        <div className="flex flex-wrap gap-1.5">
          {badges.map((badge) => (
            <Badge
              key={badge.label}
              variant={badge.tone === "primary" ? "default" : "secondary"}
            >
              {badge.label}
            </Badge>
          ))}
        </div>

        <CardDescription
          className={cn("flex items-center gap-1.5 text-sm", !location && "italic")}
        >
          <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
          {location || "Localização não informada"}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

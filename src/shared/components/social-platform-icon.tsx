import { Globe } from "lucide-react";
import {
  siFacebook,
  siInstagram,
  siTelegram,
  siThreads,
  siTiktok,
  siX,
  siYoutube,
} from "simple-icons";

export type SocialPlatformIconKey =
  | "FACEBOOK"
  | "INSTAGRAM"
  | "LINKEDIN"
  | "OTHER"
  | "TELEGRAM"
  | "THREADS"
  | "TIKTOK"
  | "X"
  | "YOUTUBE";

const brandIcons: Partial<Record<SocialPlatformIconKey, { hex: string; path: string }>> = {
  FACEBOOK: siFacebook,
  INSTAGRAM: siInstagram,
  TELEGRAM: siTelegram,
  THREADS: siThreads,
  TIKTOK: siTiktok,
  X: siX,
  YOUTUBE: siYoutube,
};

/** LinkedIn's own brand blue — used since there's no Simple Icons/Lucide glyph to color (see below). */
const LINKEDIN_BRAND_COLOR = "#0A66C2";

/**
 * LinkedIn's mark is drawn as a plain "in" badge, not the Simple Icons
 * glyph — LinkedIn issued a trademark takedown that made Simple Icons (and
 * Lucide) drop their LinkedIn icon entirely.
 */
function LinkedInGlyph({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      style={{ color: LINKEDIN_BRAND_COLOR }}
      viewBox="0 0 24 24"
    >
      <rect
        height="20"
        rx="4"
        stroke="currentColor"
        strokeWidth="2"
        width="20"
        x="2"
        y="2"
      />
      <text
        fill="currentColor"
        fontFamily="system-ui, sans-serif"
        fontSize="11"
        fontWeight="700"
        textAnchor="middle"
        x="12"
        y="16"
      >
        in
      </text>
    </svg>
  );
}

export function SocialPlatformIcon({
  className,
  platform,
}: {
  className?: string;
  platform: SocialPlatformIconKey | (string & {});
}) {
  if (platform === "LINKEDIN") {
    return <LinkedInGlyph className={className} />;
  }

  const icon = brandIcons[platform as SocialPlatformIconKey];

  if (!icon) {
    return <Globe aria-hidden="true" className={className} />;
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      style={{ color: `#${icon.hex}` }}
      viewBox="0 0 24 24"
    >
      <path d={icon.path} />
    </svg>
  );
}

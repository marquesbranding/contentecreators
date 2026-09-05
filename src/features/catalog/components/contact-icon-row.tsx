import { ExternalLink, Mail } from "lucide-react";

import { SocialPlatformIcon } from "@/shared/components/social-platform-icon";
import { WhatsAppIcon } from "@/shared/components/whatsapp-icon";
import { cn } from "@/shared/lib/cn";

import type { CatalogSocialPlatform } from "../types/creator-catalog.types";

export interface ContactIconChannel {
  href: string;
  icon: "email" | "site" | "whatsapp" | CatalogSocialPlatform;
  label: string;
  onClick?: () => void;
}

function channelIcon(icon: ContactIconChannel["icon"]) {
  if (icon === "whatsapp") {
    return <WhatsAppIcon className="size-6" />;
  }

  if (icon === "email") {
    return <Mail aria-hidden="true" className="size-5" />;
  }

  if (icon === "site") {
    return <ExternalLink aria-hidden="true" className="size-5" />;
  }

  return <SocialPlatformIcon className="size-5" monochrome platform={icon} />;
}

/**
 * "Entre em contato": a row of square icon buttons rather than a stacked
 * list of text buttons, so many channels stay scannable at a glance.
 * WhatsApp always leads, in brand green; every other channel is
 * `text-foreground` ("tudo pretinho", as requested).
 */
export function ContactIconRow({
  channels,
}: {
  channels: ContactIconChannel[];
}) {
  if (channels.length === 0) {
    return null;
  }

  return (
    <div
      aria-label="Entre em contato"
      className="flex flex-wrap gap-2"
      role="group"
    >
      {channels.map((channel) => (
        <a
          aria-label={channel.label}
          className={cn(
            "flex size-12 items-center justify-center rounded-2xl border transition-colors sm:size-14",
            channel.icon === "whatsapp"
              ? "border-transparent bg-[#25D366] text-white hover:bg-[#1fb95a]"
              : "border-border text-foreground hover:bg-muted bg-white",
          )}
          href={channel.href}
          key={`${channel.icon}-${channel.href}`}
          onClick={channel.onClick}
          rel="noopener noreferrer"
          target="_blank"
          title={channel.label}
        >
          {channelIcon(channel.icon)}
        </a>
      ))}
    </div>
  );
}

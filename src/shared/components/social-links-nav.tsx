import {
  AtSign,
  BriefcaseBusiness,
  MessageCircle,
  Music2,
} from "lucide-react";

import { ptBR } from "@/shared/copy/pt-BR";
import { cn } from "@/shared/lib/cn";

/**
 * Lucide has no brand marks, so these are deliberate stand-ins. They read as
 * monochrome glyphs on a dark footer, which is why the brand-coloured
 * `SocialPlatformIcon` (used for creator profiles) is not reused here.
 */
const socialIcons = {
  Facebook: MessageCircle,
  Instagram: AtSign,
  LinkedIn: BriefcaseBusiness,
  TikTok: Music2,
} as const;

/** The brand's own social accounts, shared by the marketing and product footers. */
export function SocialLinksNav({ className }: { className?: string }) {
  return (
    <nav aria-label="Redes sociais" className={cn("flex flex-wrap gap-3", className)}>
      {ptBR.marketing.footer.socialLinks.map((link) => {
        const Icon = socialIcons[link.label];

        return (
          <a
            aria-label={link.label}
            className="flex size-11 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-white/45 hover:text-white focus-visible:ring-3 focus-visible:ring-white/70 focus-visible:outline-none"
            href={link.href}
            key={link.label}
            rel="noopener noreferrer"
            target="_blank"
          >
            <Icon aria-hidden="true" className="size-5" />
          </a>
        );
      })}
    </nav>
  );
}

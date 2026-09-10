import {
  SocialPlatformIcon,
  type SocialPlatformIconKey,
} from "@/shared/components/social-platform-icon";
import { ptBR } from "@/shared/copy/pt-BR";
import { cn } from "@/shared/lib/cn";

/** The brand's own social accounts, shared by the marketing and product footers. */
export function SocialLinksNav({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Redes sociais"
      className={cn("flex flex-wrap gap-3", className)}
    >
      {ptBR.marketing.footer.socialLinks.map((link) => (
        <a
          aria-label={link.label}
          className="flex size-11 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-white/45 hover:text-white focus-visible:ring-3 focus-visible:ring-white/70 focus-visible:outline-none"
          href={link.href}
          key={link.label}
          rel="noopener noreferrer"
          target="_blank"
        >
          {/* Monochrome keeps the official marks legible as one row of glyphs
              on the dark footer, instead of five competing brand colours. */}
          <SocialPlatformIcon
            className="size-5"
            monochrome
            platform={link.platform satisfies SocialPlatformIconKey}
          />
        </a>
      ))}
    </nav>
  );
}

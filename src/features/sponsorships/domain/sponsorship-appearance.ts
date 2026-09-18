import type { CSSProperties } from "react";

export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
export const SPONSORSHIP_FONT_KEYS = [
  "default",
  "serif",
  "display",
  "rounded",
  "mono",
] as const;
export type SponsorshipFont = (typeof SPONSORSHIP_FONT_KEYS)[number];
export interface SponsorshipAppearance {
  textColor?: string | null;
  buttonBackgroundColor?: string | null;
  buttonTextColor?: string | null;
  fontFamily?: string | null;
}
export const sponsorshipFontFamilies: Record<SponsorshipFont, string> = {
  default: "var(--font-geist-sans, sans-serif)",
  serif: "var(--font-sponsor-serif, serif)",
  display: "var(--font-sponsor-display, sans-serif)",
  rounded: "var(--font-sponsor-rounded, sans-serif)",
  mono: "var(--font-geist-mono, monospace)",
};
export function toAppearanceStyle(
  appearance?: SponsorshipAppearance,
  button = false,
): CSSProperties {
  const color = button ? appearance?.buttonTextColor : appearance?.textColor;
  const background = button ? appearance?.buttonBackgroundColor : null;
  const font = appearance?.fontFamily;
  return {
    ...(color && HEX_COLOR_PATTERN.test(color) ? { color } : {}),
    ...(background && HEX_COLOR_PATTERN.test(background)
      ? { backgroundColor: background }
      : {}),
    ...(font && SPONSORSHIP_FONT_KEYS.includes(font as SponsorshipFont)
      ? { fontFamily: sponsorshipFontFamilies[font as SponsorshipFont] }
      : {}),
  };
}
export function contrastRatio(first: string, second: string): number | null {
  if (!HEX_COLOR_PATTERN.test(first) || !HEX_COLOR_PATTERN.test(second))
    return null;
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map((offset) => {
      const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const a = luminance(first),
    b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
export function sponsorshipAccessibleName(value: {
  imageAlt?: string | null;
  title?: string | null;
  advertiserLabel?: string | null;
}) {
  return (
    value.imageAlt?.trim() ||
    value.title?.trim() ||
    (value.advertiserLabel?.trim()
      ? `Patrocínio de ${value.advertiserLabel.trim()}`
      : "Patrocínio")
  );
}

/**
 * Noun for an audience count on a given network: LinkedIn counts
 * "conexões", YouTube and Telegram count "inscritos", everything else
 * "seguidores". Accepts any string so callers need not narrow their own
 * platform enums first.
 */
export function followerUnitLabel(
  platform: string | null | undefined,
  options: { capitalize?: boolean } = {},
): string {
  const label =
    platform === "LINKEDIN"
      ? "conexões"
      : platform === "YOUTUBE" || platform === "TELEGRAM"
        ? "inscritos"
        : "seguidores";

  return options.capitalize
    ? `${label.charAt(0).toUpperCase()}${label.slice(1)}`
    : label;
}

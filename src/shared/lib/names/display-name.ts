/**
 * Long names shrink instead of wrapping/overflowing, so the card's padding
 * stays consistent regardless of how long the display name is.
 */
export function nameSizeClass(displayName: string) {
  if (displayName.length > 30) {
    return "text-xs";
  }

  if (displayName.length > 20) {
    return "text-sm";
  }

  return "text-base";
}

/** Up to two initials, for avatar placeholders when there is no photo. */
export function initialsFromName(name: string) {
  const trimmed = name.trim();

  if (!trimmed) {
    return "";
  }

  return trimmed
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

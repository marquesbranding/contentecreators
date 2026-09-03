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

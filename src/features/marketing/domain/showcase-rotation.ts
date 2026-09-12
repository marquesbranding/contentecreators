/**
 * A marquee only reads as a carousel when the strip is longer than the
 * viewport: with fewer entries the loop puts the same card on screen twice at
 * once, so one enabled profile would look like eight copies of itself. Below
 * this bar the showcase renders as a still grid instead, padded with the
 * "your profile here" invite so the section keeps its shape.
 */
export const MIN_SHOWCASE_CAROUSEL_ITEMS = 4;

/** Slots the still grid always fills, with invites where entries run out. */
export const SHOWCASE_GRID_SLOTS = 4;

export function shouldRotateShowcase(itemCount: number) {
  return itemCount >= MIN_SHOWCASE_CAROUSEL_ITEMS;
}

/**
 * Per-column initial offset for the catalog grids' staggered ("mosaico")
 * look. Card width/height stay fixed — only where each card starts
 * vertically varies: odd columns drop by a fixed amount, even columns stay
 * put, giving the brick/quincunx pattern (outer columns aligned, columns in
 * between pushed down) at every breakpoint that has more than one column.
 */
const OFFSET_CLASS = {
  lg: "lg:mt-8",
  sm: "sm:mt-8",
  xl: "xl:mt-16",
} as const;

/**
 * A staggered column's margin-top pushes its card below the grid's own
 * bottom edge (margin isn't part of the grid's own height), so the last row
 * can spill onto whatever sits right after the `<ul>`. Padding the
 * container by the same offset used at each breakpoint reserves that space
 * instead, keeping the sibling below clear. Kept in sync with
 * `OFFSET_CLASS` by construction — update both together.
 */
export const STAGGER_CONTAINER_PADDING = "sm:pb-8 lg:pb-8 xl:pb-16";

const SM_COLUMN_OFFSETS = ["sm:mt-0", OFFSET_CLASS.sm] as const;
const LG_COLUMN_OFFSETS = ["lg:mt-0", OFFSET_CLASS.lg, "lg:mt-0"] as const;
const XL_COLUMN_OFFSETS = [
  "xl:mt-0",
  OFFSET_CLASS.xl,
  "xl:mt-0",
  OFFSET_CLASS.xl,
] as const;

export function staggerItemClassName(index: number): string {
  return [
    SM_COLUMN_OFFSETS[index % SM_COLUMN_OFFSETS.length],
    LG_COLUMN_OFFSETS[index % LG_COLUMN_OFFSETS.length],
    XL_COLUMN_OFFSETS[index % XL_COLUMN_OFFSETS.length],
  ].join(" ");
}

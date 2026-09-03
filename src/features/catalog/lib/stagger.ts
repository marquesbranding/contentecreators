/**
 * Per-column initial offset for the catalog grids' staggered ("mosaico")
 * look. Card width/height stay fixed — only where each card starts
 * vertically varies: odd columns drop by a fixed amount, even columns stay
 * put, giving the brick/quincunx pattern (outer columns aligned, columns in
 * between pushed down) at every breakpoint that has more than one column.
 */
const OFFSET_CLASS = {
  lg: "lg:mt-16",
  sm: "sm:mt-16",
  xl: "xl:mt-16",
} as const;

const SM_COLUMN_OFFSETS = ["sm:mt-0", OFFSET_CLASS.sm] as const;
const LG_COLUMN_OFFSETS = [
  "lg:mt-0",
  OFFSET_CLASS.lg,
  "lg:mt-0",
] as const;
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

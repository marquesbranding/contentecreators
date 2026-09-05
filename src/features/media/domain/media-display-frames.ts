export interface MediaDisplayFrame {
  label: string;
  /** width / height of the area actually shown to visitors at this breakpoint. */
  ratio: number;
}

/**
 * The cover renders at a fixed height and fluid width
 * (`ProfileHeaderPreview`, `CatalogDetailView`), so its visible ratio changes
 * per breakpoint. Kept in one place so the cropper's preview mask and every
 * render site agree on what's actually shown.
 */
export const coverDisplayFrames: Readonly<
  Record<"desktop" | "mobile" | "tablet", MediaDisplayFrame>
> = {
  desktop: { label: "Computador", ratio: 1200 / 208 },
  mobile: { label: "Celular", ratio: 375 / 144 },
  tablet: { label: "Tablet", ratio: 768 / 176 },
};

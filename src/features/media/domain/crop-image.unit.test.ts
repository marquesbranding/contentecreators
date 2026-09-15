import { afterEach, describe, expect, it, vi } from "vitest";
import { cropImageFile } from "./crop-image";
describe("slot-specific sponsorship crop", () => {
  afterEach(() => vi.unstubAllGlobals());
  it.each([16 / 5, 5 / 4, 4 / 3, 2, 16 / 9])(
    "exports the requested fixed ratio %s",
    async (ratio) => {
      const drawImage = vi.fn();
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage }),
        toBlob: (callback: (blob: Blob) => void) =>
          callback(new Blob(["fixture"], { type: "image/webp" })),
      };
      vi.stubGlobal("createImageBitmap", async () => ({
        width: 2000,
        height: 1600,
        close: vi.fn(),
      }));
      vi.stubGlobal("document", { createElement: () => canvas });
      await cropImageFile(
        new File(["fixture"], "creative.png", { type: "image/png" }),
        "SPONSORSHIP_CREATIVE",
        { horizontal: 50, vertical: 50, zoom: 1 },
        ratio,
      );
      expect(canvas.width / canvas.height).toBeCloseTo(ratio, 2);
      expect(canvas.width).toBeLessThanOrEqual(1600);
      expect(drawImage).toHaveBeenCalledOnce();
    },
  );
});

import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { fetchGoogleAvatar } from "./import-remote-avatar.service";
describe("Google avatar import", () => {
  it.each([
    "http://lh3.googleusercontent.com/a",
    "https://evil.test/a",
    "https://lh3.googleusercontent.com.evil.test/a",
    "https://user@lh3.googleusercontent.com/a",
    "https://lh3.googleusercontent.com:444/a",
  ])("rejects unsafe source %s before requesting it", async (url) => {
    const fetcher = vi.fn();
    await expect(fetchGoogleAvatar(url, fetcher)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("bounds MIME and advertised body size", async () => {
    for (const headers of <Record<string, string>[]>[
      { "content-type": "text/html" },
      { "content-type": "image/png", "content-length": "6000000" },
    ]) {
      await expect(
        fetchGoogleAvatar(
          "https://lh3.googleusercontent.com/a",
          vi.fn().mockResolvedValue(new Response("data", { headers })),
        ),
      ).rejects.toThrow();
    }
  });
  it("normalizes accepted images and disables redirects", async () => {
    const bytes = await sharp({
      create: { width: 64, height: 64, channels: 3, background: "blue" },
    })
      .png()
      .toBuffer();
    const fetcher = vi.fn().mockResolvedValue(
      new Response(new Uint8Array(bytes), {
        headers: { "content-type": "image/png" },
      }),
    );
    const result = await fetchGoogleAvatar(
      "https://lh3.googleusercontent.com/a=s96-c",
      fetcher,
    );
    expect(await sharp(result).metadata()).toMatchObject({
      width: 512,
      height: 512,
      format: "webp",
    });
    expect(fetcher).toHaveBeenCalledWith(
      new URL("https://lh3.googleusercontent.com/a=s512-c"),
      expect.objectContaining({ redirect: "error" }),
    );
  });
});

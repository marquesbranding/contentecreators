import "server-only";
import sharp from "sharp";

const maximumBytes = 5 * 1024 * 1024;
export async function fetchGoogleAvatar(
  value: string,
  fetcher: typeof fetch = fetch,
) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "lh3.googleusercontent.com" ||
    url.port ||
    url.username ||
    url.password
  )
    throw new Error("Avatar host is not allowed");
  url.pathname = url.pathname.replace(/=s\d+-c$/, "=s512-c");
  const response = await fetcher(url, {
    redirect: "error",
    signal: AbortSignal.timeout(5000),
  });
  if (
    !response.ok ||
    !response.body ||
    !["image/jpeg", "image/png", "image/webp"].includes(
      response.headers.get("content-type")?.split(";")[0] ?? "",
    )
  )
    throw new Error("Invalid avatar response");
  if (Number(response.headers.get("content-length")) > maximumBytes) {
    await response.body.cancel();
    throw new Error("Avatar too large");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      size += chunk.byteLength;
      if (size > maximumBytes) throw new Error("Avatar too large");
      chunks.push(chunk);
    }
  } finally {
    await reader.cancel();
  }
  return sharp(Buffer.concat(chunks), { limitInputPixels: 25_000_000 })
    .rotate()
    .resize(512, 512, { fit: "cover" })
    .webp()
    .toBuffer();
}

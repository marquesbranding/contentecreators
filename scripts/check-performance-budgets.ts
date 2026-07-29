import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

import {
  evaluatePerformanceDeliveryBudgets,
  type PerformanceDeliveryReport,
} from "../src/shared/performance/performance-budgets";

async function findFiles(
  directory: string,
  predicate: (file: string) => boolean,
): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const matches: string[][] = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return findFiles(entryPath, predicate);
      }

      return predicate(entryPath) ? [entryPath] : [];
    }),
  );

  return matches.flat();
}

async function gzipSize(file: string) {
  return gzipSync(await readFile(file)).byteLength;
}

function parseClientReferenceManifest(source: string) {
  const route = source.match(/__RSC_MANIFEST\["([^"]+)"\]/u)?.[1];
  const json = source.match(/=\s*(\{[\s\S]*\});?\s*$/u)?.[1];

  if (!route || !json) {
    return null;
  }

  const manifest = JSON.parse(json) as {
    entryJSFiles?: Record<string, string[]>;
  };
  const chunks = new Set(Object.values(manifest.entryJSFiles ?? {}).flat());

  return { chunks: [...chunks], route };
}

async function largestGzipBytes(files: string[]) {
  return Math.max(0, ...(await Promise.all(files.map(gzipSize))));
}

async function totalRawBytes(files: string[]) {
  return (
    await Promise.all(files.map(async (file) => (await stat(file)).size))
  ).reduce((total, size) => total + size, 0);
}

export async function collectPerformanceDeliveryReport(
  rootDirectory: string,
): Promise<PerformanceDeliveryReport> {
  const nextDirectory = path.join(rootDirectory, ".next");
  const chunksDirectory = path.join(nextDirectory, "static", "chunks");
  const manifestFiles = await findFiles(
    path.join(nextDirectory, "server", "app"),
    (file) => file.endsWith("_client-reference-manifest.js"),
  );
  const routes = await Promise.all(
    manifestFiles.map(async (manifestFile) => {
      const parsed = parseClientReferenceManifest(
        await readFile(manifestFile, "utf8"),
      );

      if (!parsed) {
        throw new Error(`Unable to parse ${manifestFile}.`);
      }

      const gzipBytes = (
        await Promise.all(
          parsed.chunks.map((chunk) =>
            gzipSize(
              path.join(nextDirectory, chunk.replace(/^\/_next\//u, "")),
            ),
          ),
        )
      ).reduce((total, size) => total + size, 0);

      return { gzipBytes, route: parsed.route };
    }),
  );
  const clientChunks = await findFiles(chunksDirectory, (file) =>
    file.endsWith(".js"),
  );
  const cssChunks = await findFiles(chunksDirectory, (file) =>
    file.endsWith(".css"),
  );
  const officialLogos = await findFiles(
    path.join(rootDirectory, "public", "brand", "official"),
    (file) => file.endsWith(".png"),
  );
  const selfHostedFonts = await findFiles(
    path.join(nextDirectory, "static", "media"),
    (file) => file.endsWith(".woff2"),
  );

  return {
    largestClientChunkGzipBytes: await largestGzipBytes(clientChunks),
    largestCssChunkGzipBytes: await largestGzipBytes(cssChunks),
    largestOfficialLogoBytes: Math.max(
      0,
      ...(await Promise.all(
        officialLogos.map(async (file) => (await stat(file)).size),
      )),
    ),
    routes: routes.sort((left, right) => left.route.localeCompare(right.route)),
    selfHostedFontBytes: await totalRawBytes(selfHostedFonts),
  };
}

async function main() {
  const rootDirectory = process.cwd();
  const report = await collectPerformanceDeliveryReport(rootDirectory);
  const violations = evaluatePerformanceDeliveryBudgets(report);

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (violations.length > 0) {
    throw new Error(
      `Performance budgets failed:\n- ${violations.join("\n- ")}`,
    );
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exitCode = 1;
});

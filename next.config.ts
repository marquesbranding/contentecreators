import type { NextConfig } from "next";

import {
  createEmbeddableDocumentHeaders,
  createSecurityHeaders,
} from "./src/shared/server/security-headers";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Registration sends profile images with the form; Vercel caps request
      // bodies at 4.5 MB, so stay just below it.
      bodySizeLimit: "4mb",
    },
  },
  async headers() {
    return [
      {
        headers: createSecurityHeaders({
          appEnvironment: process.env.APP_ENV,
          nodeEnvironment: process.env.NODE_ENV,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        }),
        // Everything except the published legal PDFs.
        source: "/((?!legal/).*)",
      },
      {
        headers: createEmbeddableDocumentHeaders(),
        source: "/legal/:path*",
      },
    ];
  },
};

export default nextConfig;

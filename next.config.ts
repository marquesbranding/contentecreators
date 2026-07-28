import type { NextConfig } from "next";

import { createSecurityHeaders } from "./src/shared/server/security-headers";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        headers: createSecurityHeaders({
          appEnvironment: process.env.APP_ENV,
          nodeEnvironment: process.env.NODE_ENV,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        }),
        source: "/:path*",
      },
    ];
  },
};

export default nextConfig;

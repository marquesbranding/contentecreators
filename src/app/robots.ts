import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return {
    rules: {
      allow: "/",
      disallow: [
        "/api/",
        "/app/",
        "/backoffice/",
        "/login",
        "/onboarding/",
        "/reset-password",
        "/sign-up",
      ],
      userAgent: "*",
    },
    sitemap: new URL("/sitemap.xml", baseUrl).toString(),
  };
}

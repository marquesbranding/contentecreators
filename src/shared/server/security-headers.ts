export interface SecurityHeader {
  key: string;
  value: string;
}

interface SecurityHeadersOptions {
  appEnvironment?: string;
  nodeEnvironment?: string;
  supabaseUrl?: string;
}

function externalOrigins(supabaseUrl?: string) {
  if (!supabaseUrl) {
    return [];
  }

  try {
    const url = new URL(supabaseUrl);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return [];
    }

    const websocketUrl = new URL(url.origin);
    websocketUrl.protocol = url.protocol === "https:" ? "wss:" : "ws:";

    return [url.origin, websocketUrl.origin];
  } catch {
    return [];
  }
}

function contentSecurityPolicy({
  appEnvironment,
  nodeEnvironment,
  supabaseUrl,
}: SecurityHeadersOptions) {
  const [supabaseOrigin, supabaseWebsocketOrigin] =
    externalOrigins(supabaseUrl);
  const isDevelopmentRuntime = nodeEnvironment === "development";
  const isProductionDeployment = appEnvironment === "production";
  const scriptSources = [
    "'self'",
    "'unsafe-inline'",
    ...(isDevelopmentRuntime ? ["'unsafe-eval'"] : []),
  ];

  const directives = [
    ["default-src", "'self'"],
    ["script-src", ...scriptSources],
    ["script-src-attr", "'none'"],
    ["style-src", "'self'", "'unsafe-inline'"],
    ["font-src", "'self'", "data:"],
    [
      "img-src",
      "'self'",
      "blob:",
      "data:",
      ...(supabaseOrigin ? [supabaseOrigin] : []),
    ],
    [
      "media-src",
      "'self'",
      "blob:",
      ...(supabaseOrigin ? [supabaseOrigin] : []),
    ],
    [
      "connect-src",
      "'self'",
      ...(supabaseOrigin ? [supabaseOrigin] : []),
      ...(supabaseWebsocketOrigin ? [supabaseWebsocketOrigin] : []),
    ],
    ["worker-src", "'self'", "blob:"],
    ["manifest-src", "'self'"],
    ["object-src", "'none'"],
    ["base-uri", "'none'"],
    // OAuth starts from a same-origin form and may follow redirects through
    // Supabase and Google in browsers that enforce form-action on the chain.
    [
      "form-action",
      "'self'",
      ...(supabaseOrigin ? [supabaseOrigin] : []),
      "https://accounts.google.com",
    ],
    ["frame-src", "'none'"],
    ["frame-ancestors", "'none'"],
    ...(isProductionDeployment ? [["upgrade-insecure-requests"]] : []),
  ];

  return directives.map((directive) => directive.join(" ")).join("; ");
}

export function createSecurityHeaders(
  options: SecurityHeadersOptions,
): SecurityHeader[] {
  const headers: SecurityHeader[] = [
    {
      key: "Content-Security-Policy",
      value: contentSecurityPolicy(options),
    },
    {
      key: "Permissions-Policy",
      value: [
        "accelerometer=()",
        "autoplay=()",
        "camera=()",
        "display-capture=()",
        "encrypted-media=()",
        "geolocation=()",
        "gyroscope=()",
        "magnetometer=()",
        "microphone=()",
        "midi=()",
        "payment=()",
        "picture-in-picture=()",
        "screen-wake-lock=()",
        "usb=()",
      ].join(", "),
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "X-Frame-Options",
      value: "DENY",
    },
  ];

  if (options.appEnvironment === "production") {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000",
    });
  }

  return headers;
}

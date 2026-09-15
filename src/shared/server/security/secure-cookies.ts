import "server-only";

/**
 * Whether first-party cookies should carry the `Secure` flag.
 *
 * Hosted stages always serve HTTPS. A local production build (`next start`,
 * used by the browser suites) serves plain HTTP on 127.0.0.1, where WebKit
 * drops `Secure` cookies, so the flag follows the stage rather than NODE_ENV.
 */
export function shouldUseSecureCookies() {
  return (
    process.env.NODE_ENV === "production" && process.env.APP_ENV !== "local"
  );
}

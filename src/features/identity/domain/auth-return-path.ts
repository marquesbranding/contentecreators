const defaultAuthReturnPath = "/onboarding/role";
const allowedAuthReturnPrefixes = [
  "/app",
  "/onboarding",
  "/backoffice",
  "/reset-password",
] as const;

export function sanitizeAuthReturnPath(
  value: unknown,
  fallback = defaultAuthReturnPath,
) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return fallback;
  }

  try {
    const url = new URL(value, "https://auth-return.local");
    const isAllowed = allowedAuthReturnPrefixes.some(
      (prefix) =>
        url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
    );

    if (url.origin !== "https://auth-return.local" || !isAllowed) {
      return fallback;
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}

export function buildAuthCallbackUrl(appUrl: string, destination: unknown) {
  const callbackUrl = new URL("/auth/callback", appUrl);
  callbackUrl.searchParams.set("next", sanitizeAuthReturnPath(destination));

  return callbackUrl.toString();
}

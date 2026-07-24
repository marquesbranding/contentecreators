const defaultBackofficeReturnPath = "/backoffice";
const excludedBackofficePaths = new Set([
  "/backoffice/auth-check",
  "/backoffice/login",
]);

export function sanitizeBackofficeReturnPath(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return defaultBackofficeReturnPath;
  }

  try {
    const url = new URL(value, "https://backoffice-return.local");
    const isBackofficePath =
      url.pathname === "/backoffice" || url.pathname.startsWith("/backoffice/");

    if (
      url.origin !== "https://backoffice-return.local" ||
      !isBackofficePath ||
      excludedBackofficePaths.has(url.pathname)
    ) {
      return defaultBackofficeReturnPath;
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return defaultBackofficeReturnPath;
  }
}

export function buildBackofficeAuthCheckPath(destination: unknown) {
  const search = new URLSearchParams({
    next: sanitizeBackofficeReturnPath(destination),
  });

  return `/backoffice/auth-check?${search.toString()}`;
}

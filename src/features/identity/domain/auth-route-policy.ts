interface OptimisticAuthRouteInput {
  authenticated: boolean;
  requestPath: string;
}

function isBackofficeLogin(pathname: string) {
  return pathname === "/backoffice/login";
}

function isPublicBlockedStatus(pathname: string) {
  return pathname === "/app/status/blocked";
}

function isProtectedPath(pathname: string) {
  return (
    ((pathname === "/app" || pathname.startsWith("/app/")) &&
      !isPublicBlockedStatus(pathname)) ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/") ||
    (pathname.startsWith("/backoffice") && !isBackofficeLogin(pathname))
  );
}

export function getOptimisticAuthRouteDecision({
  authenticated,
  requestPath,
}: OptimisticAuthRouteInput):
  { kind: "continue" } | { destination: string; kind: "redirect" } {
  const requestUrl = new URL(requestPath, "https://request.local");

  if (authenticated || !isProtectedPath(requestUrl.pathname)) {
    return { kind: "continue" };
  }

  const loginPath = requestUrl.pathname.startsWith("/backoffice")
    ? "/backoffice/login"
    : "/login";
  const query = new URLSearchParams({
    next: `${requestUrl.pathname}${requestUrl.search}`,
  });

  return {
    destination: `${loginPath}?${query.toString()}`,
    kind: "redirect",
  };
}

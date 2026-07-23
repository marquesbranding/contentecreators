import "server-only";

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getPublicEnv } from "@/shared/lib/env/public-env";

import { getOptimisticAuthRouteDecision } from "../../domain/auth-route-policy";

function redirectWithAuthState(
  request: NextRequest,
  authResponse: NextResponse,
  destination: string,
) {
  const redirectResponse = NextResponse.redirect(
    new URL(destination, request.url),
  );

  authResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  authResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "set-cookie") {
      redirectResponse.headers.set(key, value);
    }
  });

  return redirectResponse;
}

export async function updateProxyAuthSession(request: NextRequest) {
  const environment = getPublicEnv();
  let authResponse = NextResponse.next({ request });

  const client = createServerClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          authResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, options, value }) => {
            authResponse.cookies.set(name, value, options);
          });
          Object.entries(headers).forEach(([key, value]) => {
            authResponse.headers.set(key, value);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await client.auth.getUser();
  const decision = getOptimisticAuthRouteDecision({
    authenticated: Boolean(user),
    requestPath: `${request.nextUrl.pathname}${request.nextUrl.search}`,
  });

  if (decision.kind === "redirect") {
    return redirectWithAuthState(request, authResponse, decision.destination);
  }

  return authResponse;
}

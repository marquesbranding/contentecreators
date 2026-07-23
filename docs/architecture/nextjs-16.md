# Next.js 16 implementation notes

These notes record the repository-specific guidance reviewed before implementation. The installed documentation under `node_modules/next/dist/docs/` is authoritative for the pinned Next.js version.

## Reviewed guides

- `01-app/01-getting-started/02-project-structure.md`
- `01-app/01-getting-started/05-server-and-client-components.md`
- `01-app/01-getting-started/08-caching.md`
- `01-app/01-getting-started/15-route-handlers.md`
- `01-app/01-getting-started/16-proxy.md`
- `01-app/01-getting-started/17-deploying.md`
- `01-app/02-guides/authentication.md`
- `01-app/02-guides/data-security.md`
- `01-app/02-guides/server-actions.md`

## Decisions applied to this repository

1. `src/app` is the routing and composition layer. Feature implementation lives under `src/features`; `_providers` and other underscore-prefixed folders inside `app` are private, non-route composition details.
2. Pages and layouts are Server Components by default. Client boundaries are placed on the smallest interactive leaves so server-only modules and secrets cannot enter the browser graph.
3. `src/proxy.ts` is the single Next.js 16 Proxy entry point. It may refresh Supabase cookies and perform optimistic redirects, but it is not the authoritative authorization layer and must not perform slow database work.
4. Authentication, session resolution, authorization, ownership, and status checks are repeated close to protected data and mutations in the server-only DAL/services. Cookie session payloads are never trusted without verification.
5. Server Actions are treated as public HTTP entry points: validate input, authenticate, authorize, and return minimal serializable results. Route Handlers remain thin transport adapters and cannot duplicate a Server Action use case.
6. Interactive browser requests use same-origin Route Handlers. Route Handlers are dynamic when they access cookies, request properties, or the database; no protected response is accidentally shared through public caching.
7. Cache behavior is explicit. Personalized or authorization-sensitive data is not placed in a cross-user cache. Streaming uses focused `Suspense` boundaries rather than forcing the whole root layout to request time.
8. Vercel deployment uses the standard Node.js runtime and the existing `build`/`start` scripts. Static export is not suitable because Auth, Route Handlers, Server Actions, and server-side database access require a server runtime.

## Review gate

Before introducing a new Next.js API or convention, read its installed guide first. Any example copied from older `middleware.ts`, Pages Router, sync request APIs, or implicit caching guidance must be rewritten for the pinned Next.js version.

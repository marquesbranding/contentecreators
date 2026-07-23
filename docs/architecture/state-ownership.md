# State ownership and command transport

This matrix is a review gate. A value has one authoritative owner; moving it
elsewhere requires an architecture decision.

| Concern                                                                           | Owner                                                           | Allowed access                                                                                 | Never do                                                                                        |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Auth identity, account role/status, permissions, security-sensitive initial reads | React Server Components through the server-only DAL             | Minimal DTO after verifying the token, account, status, policy, and RLS context                | Trust Zustand, browser cache, form input, Proxy, or unverified session metadata                 |
| Interactive remote reads and mutations                                            | Feature hook + TanStack Query + typed same-origin Axios adapter | `/api` Route Handlers, stable feature query keys, `AbortSignal`, explicit invalidation/removal | Mirror remote entities into Zustand or call Supabase/third parties directly from the browser    |
| Progressive-enhancement form commands                                             | Server Action                                                   | Thin adapter to the same server use case and shared schema                                     | Add a duplicate Axios endpoint for the same command                                             |
| Shareable search, filters, order, pagination                                      | URL search parameters                                           | Parse and update in a focused feature hook                                                     | Store as the source of truth in Zustand                                                         |
| Form values and validation state                                                  | React Hook Form or component-local state                        | Zod resolver, dirty/touched/error state local to the form                                      | Persist fields, documents, CNPJ, email, or WhatsApp in the global store                         |
| Component disclosure and short-lived selection                                    | Local React state                                               | Promote only when distant surfaces genuinely coordinate it                                     | Create a generic global bag                                                                     |
| Cross-route ephemeral UI                                                          | Factory-built Zustand application store                         | Mobile navigation, global drawers/dialogs, non-sensitive upload queue                          | Store user/session/role/status, server permissions, API entities, form values, URLs, or secrets |
| Server-prefetched interactive data                                                | TanStack Query cache rendered by the client query owner         | Per-request server QueryClient + targeted `HydrationBoundary`                                  | Render a second independent server copy beside the query-owned view                             |

## One command, one transport

Every mutation use case chooses exactly one public transport:

- Use a Server Action when native form submission and progressive enhancement
  are the primary interaction.
- Use a same-origin Route Handler when the client needs cancellation, polling,
  incremental pagination, optimistic query updates, or shared browser caching.
- Both transports may call the same server service internally, but they must
  not both expose the same command.

Regardless of transport, the server revalidates authentication, authorization,
ownership, current account status, optimistic version, and input. UI checks are
never a security boundary.

## Review questions

1. Is there exactly one authoritative owner and one client render owner?
2. Does every query use a feature-owned key factory and forward the query
   `signal` to Axios?
3. Are authorization and account status checked before protected execution?
4. Is a command exposed by only one transport?
5. Could this Zustand field live in local state, the URL, a form, or TanStack
   Query instead? If yes, it must.

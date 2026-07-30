# Vertical slice architecture

The application is one Next.js modular monolith. `src/app` owns routing and
composition; each business capability lives in `src/features/<feature>`.
Folders are created only when a behavior needs them—empty scaffolding is not
allowed.

## Dependency graph

```text
src/app routes and _providers
             |
             v
feature index.ts, focused client.ts, or guarded server.ts
             |
             v
same feature implementation
       |                 |
       v                 v
domain-neutral shared   db (server graph only)
```

- `app` imports feature public APIs, plus domain-neutral shared presentation
  and infrastructure where composition requires it.
- A feature imports its own internals, `shared`, and—only from its server
  graph—`db`. Cross-feature access uses the other feature's appropriate public
  API.
- `shared` and `db` never import business features.
- Browser-safe graphs never import `server.ts`, `server/`, `db`, or
  `shared/server`.
- Server graphs never import client hooks or Zustand modules.
- `index.ts` is the general browser-safe/shared public API. A focused
  `client.ts` may expose a narrow route-specific Client Component graph when
  importing the general barrel would ship unrelated feature UI. `server.ts`
  begins with `server-only` and explicitly exports the server API. None is a
  wildcard barrel.

ESLint enforces the dependency direction, blocks deep feature imports from
routes, keeps server modules out of client graphs, and prevents production code
from importing tests.

## Slice contract

| Path                   | Responsibility                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `api/`                 | Typed Axios calls and TanStack Query key/option factories; no React, direct providers, or authorization decisions   |
| `components/`          | Feature presentation; interactive leaves are narrowly marked client-side                                            |
| `hooks/`               | Branching client orchestration such as queries, uploads, and URL synchronization—not permission or domain authority |
| `domain/`              | Pure deterministic rules and value transformations with no framework, network, database, or browser APIs            |
| `schemas/`             | Zod validation at form, action, API, and provider boundaries; infer input types                                     |
| `types/`               | Narrow DTO/view-model/command/result contracts, never Drizzle row mirrors or credentials                            |
| `stores/`              | Rare non-sensitive, cross-route ephemeral UI contribution; never remote, Auth, form, URL, or secret state           |
| `server/actions/`      | Thin Server Action adapters for one command transport                                                               |
| `server/components/`   | Server-connected UI exported only through `server.ts`                                                               |
| `server/services/`     | Application use-case orchestration and transaction coordination                                                     |
| `server/repositories/` | Feature-owned Drizzle queries and persistence mapping                                                               |
| `server/policies/`     | Explicit authorization, eligibility, and transition rules                                                           |
| `server/mappers/`      | Provider/database records to minimal DTOs and safe audit inputs                                                     |
| `tests/`               | Behavior-grouped contract/integration fixtures when co-location is insufficient                                     |

## Naming

Source identifiers and filenames are English and behavior-oriented:

- `approve-submission.service.ts`
- `catalog.repository.ts`
- `use-catalog-query.ts`
- `company-profile.schema.ts`
- `catalog-query-keys.ts`

Avoid `helpers.ts`, `common.ts`, one growing `service.ts`, and technical slices
such as `components` or `services`. Interface copy stays in correct `pt-BR`.

Custom hooks exist when they isolate meaningful branching or reusable
orchestration. Presentational components receive narrow props. Services mean
server-side application orchestration only; browser requests live in `api/`.

## When to split or promote

Split a feature when part of it gains an independent business vocabulary and
lifecycle, materially different authorization rules, or a public API that can
no longer be explained concisely. File count alone is not a reason.

Promote code to `shared` only when it is domain-neutral, already reused across
multiple features, has a stable small API, and contains no feature vocabulary.
Reviewers reject speculative promotion.

## Pull-request checklist

1. The first behavior test failed before implementation and now passes.
2. Route files compose public APIs and contain no business behavior.
3. Client/server entry points are explicit and runtime-safe.
4. The change follows the state-ownership matrix and one-command rule.
5. Authorization denial paths are covered at the server boundary.
6. No remote entity or security state was copied into Zustand.
7. New folders and abstractions are used now, not reserved for later.
8. Naming describes product behavior in English; interface copy is `pt-BR`.

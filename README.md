# Multi-Tenant Bookmark Manager

A small multi-tenant bookmark manager built with Next.js 15, Drizzle ORM, and
PostgreSQL. Every user belongs to a tenant, and every query is scoped to the
caller's tenant — enforced both in application code and, more importantly, in the
database schema itself via composite foreign keys.

Built for a code-structure assessment: the emphasis is clean layering and provable
tenant isolation, not feature breadth.

## Stack

| Tool | Purpose |
| --- | --- |
| Next.js 15 (App Router) | API routes, middleware, UI |
| TypeScript (strict) | Types throughout |
| Drizzle ORM + PostgreSQL | Schema-first data access |
| Zod | Input validation at the API boundary |
| Vitest | Unit + integration tests |
| Tailwind CSS | Styling |

## Architecture

Code is split into layers with a strict, one-directional dependency flow. Each
layer has one job, and nothing points back up:

```
HTTP request
   │
   ▼
middleware.ts ............ fakes auth: injects x-user-id / x-tenant-id
   │
   ▼
route handler ............ HTTP only: parse, validate (Zod), serialise
   │  (src/app/api/**)
   ▼
service .................. business rules: ownership, tenant scoping
   │  (bookmark.service.ts)     — no HTTP, no Drizzle
   ▼
repository ............... the ONLY layer that touches Drizzle;
   │  (bookmark.repository.ts)   every query is tenant-scoped
   ▼
PostgreSQL ............... composite FKs enforce tenant integrity
```

```
src/
├── app/
│   ├── api/bookmarks/route.ts        POST (create), GET (list)
│   ├── api/bookmarks/[id]/route.ts   DELETE
│   └── page.tsx                      UI: list + add form
├── db/
│   ├── schema.ts                     tables + composite FKs
│   ├── client.ts                     Drizzle connection
│   └── seed.ts                       tenants, users, sample bookmarks
├── lib/
│   ├── session.ts                    Session type + getSession()
│   ├── errors.ts                     typed error hierarchy
│   ├── http.ts                       error → HTTP response mapping
│   └── dev-identities.ts             fixed dev/test tenant + user IDs
├── modules/bookmarks/
│   ├── bookmark.repository.ts        Drizzle data access
│   ├── bookmark.service.ts           business logic
│   ├── bookmark.schema.ts            Zod schemas
│   └── bookmark.types.ts             domain types
└── middleware.ts                     fake session injection
```

## Prerequisites

- Node.js 20+
- Docker (for PostgreSQL) — or a local Postgres instance

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Environment
cp .env.example .env          # DATABASE_URL points at the docker Postgres

# 3. Start PostgreSQL
docker compose up -d

# 4. Apply the schema
npm run db:migrate

# 5. Seed tenants, users, and sample bookmarks
npm run db:seed

# 6. Run the app
npm run dev                   # http://localhost:3000
```

Using your own Postgres instead of Docker? Point `DATABASE_URL` in `.env` at it and
skip step 3.

## Authentication (faked)

There is no real auth. `src/middleware.ts` stands in for it: on every `/api/*`
request it injects a session as `x-user-id` / `x-tenant-id` headers, defaulting to
**Tenant A**. It **overwrites** any such headers sent by the client, so the tenant
is always server-decided and can't be spoofed. Route handlers read the session via
`getSession()`, and that `tenantId` scopes every query.

Swapping in real auth would mean changing only the middleware (verify a token,
derive the identity) — nothing downstream changes.

### Acting as another tenant

For manual testing you can act as Tenant B by sending an `x-dev-identity: tenantB`
header. This is how tenant isolation can be checked by hand:

```bash
# Tenant A (default) — sees its seeded bookmarks
curl -s localhost:3000/api/bookmarks

# Tenant B — sees none of Tenant A's
curl -s localhost:3000/api/bookmarks -H "x-dev-identity: tenantB"

# Tenant B tries to delete Tenant A's bookmark — 404
curl -i -X DELETE \
  localhost:3000/api/bookmarks/c0000000-0000-4000-8000-000000000001 \
  -H "x-dev-identity: tenantB"
```

## API

| Method | Route | Body | Success |
| --- | --- | --- | --- |
| POST | `/api/bookmarks` | `{ url, title, tags? }` | `201` + bookmark |
| GET | `/api/bookmarks` | — | `200` + bookmark[] |
| DELETE | `/api/bookmarks/[id]` | — | `204` |

`tags` is an optional `string[]`. Input is validated with Zod at the boundary.

### Error responses

Every endpoint returns errors in one consistent envelope:

```json
{ "error": { "code": "NOT_FOUND", "message": "Bookmark not found." } }
```

| Status | Code | When |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | No session on the request |
| 404 | `NOT_FOUND` | Bookmark doesn't exist, or belongs to another tenant |
| 403 | `FORBIDDEN` | Bookmark is in your tenant but owned by another user |
| 422 | `VALIDATION_ERROR` | Body/params failed Zod validation (issues in `details`) |
| 500 | `INTERNAL_ERROR` | Unexpected — details are logged, never leaked |

A cross-tenant delete returns **404, not 403**, on purpose: a 403 would reveal that
the bookmark exists in another tenant. A 404 leaks nothing.

## Tenant isolation

Isolation is enforced at two levels:

1. **Application** — every repository method requires a `tenantId` and includes it
   in the `WHERE` clause. The service scopes all queries by the session's tenant.
2. **Database** — a composite foreign key,
   `bookmarks(tenant_id, user_id) → users(tenant_id, id)`, makes it physically
   impossible to attach a bookmark to a user in a different tenant.

## Testing

```bash
npm test                 # all tests
npm run test:unit        # service unit tests (mocked repository)
npm run test:integration # tenant isolation, against the real DB
```

The integration test requires the database to be running (`docker compose up -d`)
and migrated. It creates its own throwaway tenants, so it doesn't disturb the seed.

**What's covered:** the service layer's business rules (tenant/user scoping,
ownership, 404-vs-403), and — end to end — that Tenant B cannot read or delete
Tenant A's bookmarks, including that the composite FK rejects a cross-tenant insert
at the database level.

**What's intentionally not covered, given the time box:** route-handler/Zod glue and
the UI. The priority was proving the isolation guarantee over broad shallow coverage.


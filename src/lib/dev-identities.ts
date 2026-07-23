/**
 * Fixed identities used to fake authentication in development and tests.
 *
 * The middleware injects one of these as the "logged-in" session, and the seed
 * script (src/db/seed.ts) inserts these exact tenant/user rows — so the IDs the
 * session carries always line up with real records. That match is required by
 * the composite FK on `bookmarks`, which rejects any (tenant_id, user_id) that
 * doesn't exist in `users`.
 *
 * `tenantA` is the default caller. `tenantB` exists so tests (and manual pokes
 * via the `x-dev-identity` header) can act as a different tenant and prove that
 * tenant isolation holds.
 */
// Valid v4-format UUIDs (correct version/variant bits) so they pass the same
// strict z.uuid() validation the API applies to real ids.
export const DEV_IDENTITIES = {
  tenantA: {
    tenantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    userId: "a0000000-0000-4000-8000-000000000001",
  },
  tenantB: {
    tenantId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    userId: "b0000000-0000-4000-8000-000000000002",
  },
} as const;

export type DevIdentityKey = keyof typeof DEV_IDENTITIES;

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
export const DEV_IDENTITIES = {
  tenantA: {
    tenantId: "00000000-0000-0000-0000-0000000000a1",
    userId: "00000000-0000-0000-0000-0000000000a2",
  },
  tenantB: {
    tenantId: "00000000-0000-0000-0000-0000000000b1",
    userId: "00000000-0000-0000-0000-0000000000b2",
  },
} as const;

export type DevIdentityKey = keyof typeof DEV_IDENTITIES;

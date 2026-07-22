import { NextResponse, type NextRequest } from "next/server";

import { DEV_IDENTITIES, type DevIdentityKey } from "@/lib/dev-identities";
import { SESSION_HEADERS } from "@/lib/session";

/**
 * Fake authentication.
 *
 * A real app would verify a token here and derive the session from it. We just
 * inject a known identity as headers on the request, which route handlers read
 * via getSession(). Crucially, the tenant/user come from here — set server-side
 * — not from the request body, so the client can never claim another tenant.
 *
 * For local testing you can act as a different tenant by sending the header
 * `x-dev-identity: tenantB`; anything else defaults to tenantA.
 */
export function middleware(request: NextRequest) {
  const requested = request.headers.get("x-dev-identity");
  const key: DevIdentityKey = requested === "tenantB" ? "tenantB" : "tenantA";
  const identity = DEV_IDENTITIES[key];

  // Copy incoming headers, then overwrite the session headers so a client can't
  // spoof them by sending their own x-user-id / x-tenant-id.
  const headers = new Headers(request.headers);
  headers.set(SESSION_HEADERS.userId, identity.userId);
  headers.set(SESSION_HEADERS.tenantId, identity.tenantId);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: "/api/:path*",
};

import { UnauthorizedError } from "./errors";

/**
 * The authenticated caller. In a real app this would come from a decoded token;
 * here the middleware fakes it by injecting `x-user-id` / `x-tenant-id` headers.
 *
 * Every downstream query scopes by `tenantId` from this object — never from
 * anything the client puts in the request body — so a caller cannot act outside
 * their own tenant.
 */
export interface Session {
  userId: string;
  tenantId: string;
}

/** Header names the middleware writes and route handlers read. */
export const SESSION_HEADERS = {
  userId: "x-user-id",
  tenantId: "x-tenant-id",
} as const;

/**
 * Reads the session the middleware attached to the request. Throws if it's
 * missing, which in practice means the middleware didn't run for this route.
 */
export function getSession(request: Request): Session {
  const userId = request.headers.get(SESSION_HEADERS.userId);
  const tenantId = request.headers.get(SESSION_HEADERS.tenantId);

  if (!userId || !tenantId) {
    throw new UnauthorizedError("No session on request.");
  }

  return { userId, tenantId };
}

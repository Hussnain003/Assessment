import { ValidationError } from "@/lib/errors";
import { jsonOk, toErrorResponse } from "@/lib/http";
import { getSession } from "@/lib/session";
import { createBookmarkSchema } from "@/modules/bookmarks/bookmark.schema";
import { bookmarkService } from "@/modules/bookmarks/bookmark.service";

/**
 * POST /api/bookmarks — create a bookmark for the current user.
 *
 * The handler is deliberately thin: read the session, validate the body with
 * Zod, delegate to the service, serialise the result. All errors funnel through
 * one catch into the shared error envelope.
 */
export async function POST(request: Request) {
  try {
    const session = getSession(request);

    const body = await request.json().catch(() => {
      throw new ValidationError("Request body must be valid JSON.");
    });

    const parsed = createBookmarkSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid bookmark input.", parsed.error.issues);
    }

    const bookmark = await bookmarkService.create(session, parsed.data);
    return jsonOk(bookmark, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** GET /api/bookmarks — list the current user's bookmarks. */
export async function GET(request: Request) {
  try {
    const session = getSession(request);
    const bookmarks = await bookmarkService.list(session);
    return jsonOk(bookmarks);
  } catch (error) {
    return toErrorResponse(error);
  }
}

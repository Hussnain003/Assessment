import { ValidationError } from "@/lib/errors";
import { toErrorResponse } from "@/lib/http";
import { getSession } from "@/lib/session";
import { bookmarkIdSchema } from "@/modules/bookmarks/bookmark.schema";
import { bookmarkService } from "@/modules/bookmarks/bookmark.service";

/**
 * DELETE /api/bookmarks/[id] — delete a bookmark the caller owns.
 *
 * Ownership and tenant checks live in the service; on success there's nothing to
 * return, so we respond 204 No Content.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);

    const { id } = await params;
    const parsed = bookmarkIdSchema.safeParse(id);
    if (!parsed.success) {
      throw new ValidationError("Invalid bookmark id.", parsed.error.issues);
    }

    await bookmarkService.remove(session, parsed.data);
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

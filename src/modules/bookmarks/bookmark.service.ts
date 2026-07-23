import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { Session } from "@/lib/session";

import {
  bookmarkRepository,
  type BookmarkRepository,
} from "./bookmark.repository";
import type { Bookmark } from "./bookmark.types";

/**
 * The fields a caller supplies when creating a bookmark. Tenant and user are NOT
 * here — they come from the session, so a client can't set them.
 */
export interface CreateBookmarkData {
  url: string;
  title: string;
  tags: string[];
}

/**
 * Business logic for bookmarks. Knows nothing about Drizzle or HTTP — it takes a
 * Session, applies the rules, and throws typed errors (which the route boundary
 * maps to HTTP). It talks to the database only through the repository interface,
 * which is what lets it be unit-tested against a mock.
 */
export interface BookmarkService {
  create(session: Session, data: CreateBookmarkData): Promise<Bookmark>;
  list(session: Session): Promise<Bookmark[]>;
  remove(session: Session, id: string): Promise<void>;
}

export function createBookmarkService(
  repository: BookmarkRepository,
): BookmarkService {
  return {
    async create(session, data) {
      return repository.create({
        tenantId: session.tenantId,
        userId: session.userId,
        url: data.url,
        title: data.title,
        tags: data.tags,
      });
    },

    async list(session) {
      return repository.listByUser({
        tenantId: session.tenantId,
        userId: session.userId,
      });
    },

    async remove(session, id) {
      const bookmark = await repository.findById({
        tenantId: session.tenantId,
        id,
      });

      // Not in this tenant (or doesn't exist at all) — a 404 avoids revealing
      // that a bookmark with this id exists in some other tenant.
      if (!bookmark) {
        throw new NotFoundError("Bookmark not found.");
      }

      // In this tenant, but owned by someone else.
      if (bookmark.userId !== session.userId) {
        throw new ForbiddenError("You do not have access to this bookmark.");
      }

      await repository.deleteById({ tenantId: session.tenantId, id });
    },
  };
}

/** Default service wired with the real repository, used by the route handlers. */
export const bookmarkService = createBookmarkService(bookmarkRepository);

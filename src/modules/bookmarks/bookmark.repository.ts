import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { bookmarks } from "@/db/schema";

import type {
  Bookmark,
  BookmarkByIdParams,
  CreateBookmarkInput,
  ListBookmarksParams,
} from "./bookmark.types";

/**
 * Data-access for bookmarks. This is the ONLY layer that touches Drizzle.
 *
 * Every method requires a `tenantId` and includes it in the WHERE clause (or the
 * inserted row), so it is impossible to read, delete, or create a bookmark
 * outside the caller's tenant. The interface is exported so the service can be
 * unit-tested against a mock without a database.
 */
export interface BookmarkRepository {
  create(input: CreateBookmarkInput): Promise<Bookmark>;
  listByUser(params: ListBookmarksParams): Promise<Bookmark[]>;
  findById(params: BookmarkByIdParams): Promise<Bookmark | null>;
  deleteById(params: BookmarkByIdParams): Promise<boolean>;
}

export const bookmarkRepository: BookmarkRepository = {
  async create(input) {
    const [row] = await db
      .insert(bookmarks)
      .values({
        tenantId: input.tenantId,
        userId: input.userId,
        url: input.url,
        title: input.title,
        tags: input.tags,
      })
      .returning();

    return row;
  },

  async listByUser({ tenantId, userId }) {
    return db
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.tenantId, tenantId), eq(bookmarks.userId, userId)))
      .orderBy(desc(bookmarks.createdAt));
  },

  async findById({ tenantId, id }) {
    const [row] = await db
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.tenantId, tenantId), eq(bookmarks.id, id)))
      .limit(1);

    return row ?? null;
  },

  async deleteById({ tenantId, id }) {
    const deleted = await db
      .delete(bookmarks)
      .where(and(eq(bookmarks.tenantId, tenantId), eq(bookmarks.id, id)))
      .returning({ id: bookmarks.id });

    return deleted.length > 0;
  },
};

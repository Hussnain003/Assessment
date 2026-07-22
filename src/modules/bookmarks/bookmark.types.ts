import type { InferSelectModel } from "drizzle-orm";

import type { bookmarks } from "@/db/schema";

/** A bookmark row as it exists in the database. */
export type Bookmark = InferSelectModel<typeof bookmarks>;

/**
 * Everything the repository needs to insert a bookmark. Note `tenantId` and
 * `userId` are explicit inputs — they come from the caller's session, never
 * from the request body.
 */
export interface CreateBookmarkInput {
  tenantId: string;
  userId: string;
  url: string;
  title: string;
  tags: string[];
}

/** Tenant-scoped lookup by the owning user. */
export interface ListBookmarksParams {
  tenantId: string;
  userId: string;
}

/** Tenant-scoped lookup / delete by bookmark id. */
export interface BookmarkByIdParams {
  tenantId: string;
  id: string;
}

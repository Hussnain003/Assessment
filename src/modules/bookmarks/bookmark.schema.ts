import { z } from "zod";

/**
 * Input validation for the bookmark endpoints. This is the boundary where
 * untrusted client data enters, so it's the one place Zod runs — the service and
 * repository trust their inputs.
 */
export const createBookmarkSchema = z.object({
  url: z.url("Must be a valid URL."),
  title: z.string().trim().min(1, "Title is required.").max(200),
  // Optional in the request; normalised to an empty array so downstream layers
  // always receive a string[].
  tags: z.array(z.string().trim().min(1)).max(50).optional().default([]),
});

/** The validated create payload (url, title, tags: string[]). */
export type CreateBookmarkBody = z.infer<typeof createBookmarkSchema>;

/** Route param `[id]` must be a UUID. */
export const bookmarkIdSchema = z.uuid("Invalid bookmark id.");

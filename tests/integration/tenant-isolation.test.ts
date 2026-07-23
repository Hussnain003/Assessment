import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { client, db } from "@/db/client";
import { bookmarks, tenants, users } from "@/db/schema";
import { NotFoundError } from "@/lib/errors";
import type { Session } from "@/lib/session";
import { bookmarkRepository } from "@/modules/bookmarks/bookmark.repository";
import { createBookmarkService } from "@/modules/bookmarks/bookmark.service";

/**
 * Integration test against the real database (via Docker). It proves the core
 * requirement: a user in Tenant B cannot read or delete Tenant A's bookmarks.
 *
 * It creates its own throwaway tenants/users so it doesn't depend on or disturb
 * the seed data, and cleans them up afterwards (cascade removes users +
 * bookmarks).
 */

const service = createBookmarkService(bookmarkRepository);

const tenantAId = randomUUID();
const tenantBId = randomUUID();
const userAId = randomUUID();
const userBId = randomUUID();

const sessionA: Session = { tenantId: tenantAId, userId: userAId };
const sessionB: Session = { tenantId: tenantBId, userId: userBId };

let tenantABookmarkId: string;

beforeAll(async () => {
  await db.insert(tenants).values([
    { id: tenantAId, name: "IT Tenant A" },
    { id: tenantBId, name: "IT Tenant B" },
  ]);

  await db.insert(users).values([
    { id: userAId, tenantId: tenantAId, email: `a-${userAId}@test.local` },
    { id: userBId, tenantId: tenantBId, email: `b-${userBId}@test.local` },
  ]);

  const created = await service.create(sessionA, {
    url: "https://tenant-a-private.example",
    title: "Tenant A private bookmark",
    tags: ["secret"],
  });
  tenantABookmarkId = created.id;
});

afterAll(async () => {
  // Cascades to users + bookmarks belonging to these tenants.
  await db.delete(tenants).where(eq(tenants.id, tenantAId));
  await db.delete(tenants).where(eq(tenants.id, tenantBId));
  await client.end();
});

describe("tenant isolation", () => {
  it("Tenant A can see its own bookmark", async () => {
    const list = await service.list(sessionA);
    expect(list.map((b) => b.id)).toContain(tenantABookmarkId);
  });

  it("Tenant B cannot see Tenant A's bookmarks", async () => {
    const list = await service.list(sessionB);
    expect(list.map((b) => b.id)).not.toContain(tenantABookmarkId);
  });

  it("Tenant B cannot delete Tenant A's bookmark (404, and it survives)", async () => {
    await expect(
      service.remove(sessionB, tenantABookmarkId),
    ).rejects.toBeInstanceOf(NotFoundError);

    const [row] = await db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.id, tenantABookmarkId));
    expect(row).toBeDefined();
  });

  it("the database rejects a cross-tenant bookmark via the composite FK", async () => {
    // user A does not belong to tenant B — the composite FK must reject this.
    await expect(
      db.insert(bookmarks).values({
        tenantId: tenantBId,
        userId: userAId,
        url: "https://should-not-insert.example",
        title: "Invalid cross-tenant bookmark",
        tags: [],
      }),
    ).rejects.toThrow();
  });
});

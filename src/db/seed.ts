import "dotenv/config";

import { DEV_IDENTITIES } from "../lib/dev-identities";
import { client, db } from "./client";
import { bookmarks, tenants, users } from "./schema";

/**
 * Seeds the two fixed identities from dev-identities.ts (which the middleware and
 * the isolation test both rely on), plus a couple of sample bookmarks for Tenant
 * A. Fixed IDs + onConflictDoNothing make it safe to run repeatedly.
 */
async function seed() {
  const { tenantA, tenantB } = DEV_IDENTITIES;

  await db
    .insert(tenants)
    .values([
      { id: tenantA.tenantId, name: "Tenant A" },
      { id: tenantB.tenantId, name: "Tenant B" },
    ])
    .onConflictDoNothing();

  await db
    .insert(users)
    .values([
      {
        id: tenantA.userId,
        tenantId: tenantA.tenantId,
        email: "alice@tenant-a.test",
      },
      {
        id: tenantB.userId,
        tenantId: tenantB.tenantId,
        email: "bob@tenant-b.test",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(bookmarks)
    .values([
      {
        id: "c0000000-0000-4000-8000-000000000001",
        tenantId: tenantA.tenantId,
        userId: tenantA.userId,
        url: "https://nextjs.org/docs",
        title: "Next.js Documentation",
        tags: ["reference", "framework"],
      },
      {
        id: "c0000000-0000-4000-8000-000000000002",
        tenantId: tenantA.tenantId,
        userId: tenantA.userId,
        url: "https://orm.drizzle.team",
        title: "Drizzle ORM",
        tags: ["reference", "database"],
      },
    ])
    .onConflictDoNothing();

  console.log(
    "Seed complete: 2 tenants, 2 users, and 2 sample bookmarks for Tenant A.",
  );
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });

import { sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Every table carries a `tenant_id`. Tenant integrity is enforced in the schema
 * itself via composite foreign keys, not just in application code:
 *
 *   bookmarks(tenant_id, user_id)  ->  users(tenant_id, id)
 *
 * This makes it physically impossible to insert a bookmark that references a
 * user in a different tenant — the database rejects it.
 */

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Target for the composite FK from bookmarks — a user is uniquely
    // identified by (tenant_id, id).
    unique("users_tenant_id_id_unique").on(table.tenantId, table.id),
    // Emails are unique per tenant, not globally.
    unique("users_tenant_id_email_unique").on(table.tenantId, table.email),
  ],
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    // Optional tags — stored as a Postgres text[]; defaults to an empty array.
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // The core requirement: a bookmark's (tenant_id, user_id) must reference an
    // existing user *in the same tenant*.
    foreignKey({
      columns: [table.tenantId, table.userId],
      foreignColumns: [users.tenantId, users.id],
      name: "bookmarks_tenant_user_fk",
    }).onDelete("cascade"),
    // Supports the tenant-scoped "list this user's bookmarks" query.
    index("bookmarks_tenant_user_idx").on(table.tenantId, table.userId),
  ],
);

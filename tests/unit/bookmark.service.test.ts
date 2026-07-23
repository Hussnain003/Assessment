import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { Session } from "@/lib/session";
import type { BookmarkRepository } from "@/modules/bookmarks/bookmark.repository";
import { createBookmarkService } from "@/modules/bookmarks/bookmark.service";
import type { Bookmark } from "@/modules/bookmarks/bookmark.types";

/**
 * Unit tests for the service layer. The repository is fully mocked, so these
 * exercise the business rules — tenant/user scoping and ownership — without a
 * database.
 */

const sessionA: Session = { tenantId: "tenant-a", userId: "user-a" };

function buildBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: "bookmark-1",
    tenantId: "tenant-a",
    userId: "user-a",
    url: "https://example.com",
    title: "Example",
    tags: [],
    createdAt: new Date(),
    ...overrides,
  };
}

function buildRepo(): BookmarkRepository {
  return {
    create: vi.fn(),
    listByUser: vi.fn(),
    findById: vi.fn(),
    deleteById: vi.fn(),
  };
}

let repo: BookmarkRepository;

beforeEach(() => {
  repo = buildRepo();
});

describe("create", () => {
  it("stamps the session's tenant and user onto the new bookmark", async () => {
    const service = createBookmarkService(repo);
    vi.mocked(repo.create).mockResolvedValue(buildBookmark());

    await service.create(sessionA, {
      url: "https://example.com",
      title: "Example",
      tags: ["a"],
    });

    expect(repo.create).toHaveBeenCalledWith({
      tenantId: "tenant-a",
      userId: "user-a",
      url: "https://example.com",
      title: "Example",
      tags: ["a"],
    });
  });
});

describe("list", () => {
  it("scopes the query to the session's tenant and user", async () => {
    const service = createBookmarkService(repo);
    vi.mocked(repo.listByUser).mockResolvedValue([]);

    await service.list(sessionA);

    expect(repo.listByUser).toHaveBeenCalledWith({
      tenantId: "tenant-a",
      userId: "user-a",
    });
  });
});

describe("remove", () => {
  it("throws NotFound when the bookmark is not in the tenant", async () => {
    const service = createBookmarkService(repo);
    vi.mocked(repo.findById).mockResolvedValue(null);

    await expect(service.remove(sessionA, "missing")).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(repo.deleteById).not.toHaveBeenCalled();
  });

  it("throws Forbidden when the bookmark belongs to another user in the tenant", async () => {
    const service = createBookmarkService(repo);
    vi.mocked(repo.findById).mockResolvedValue(
      buildBookmark({ userId: "someone-else" }),
    );

    await expect(service.remove(sessionA, "bookmark-1")).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(repo.deleteById).not.toHaveBeenCalled();
  });

  it("deletes the bookmark when the caller owns it", async () => {
    const service = createBookmarkService(repo);
    vi.mocked(repo.findById).mockResolvedValue(buildBookmark());
    vi.mocked(repo.deleteById).mockResolvedValue(true);

    await service.remove(sessionA, "bookmark-1");

    expect(repo.deleteById).toHaveBeenCalledWith({
      tenantId: "tenant-a",
      id: "bookmark-1",
    });
  });
});

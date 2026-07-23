"use client";

import { useEffect, useState, type FormEvent } from "react";

/** Shape returned by the API (dates arrive as ISO strings over JSON). */
interface Bookmark {
  id: string;
  url: string;
  title: string;
  tags: string[];
  createdAt: string;
}

/** Reads the shared error envelope, falling back to a generic message. */
async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    return body?.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

/** Strips the protocol for a cleaner display of the URL. */
function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export default function Home() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadBookmarks() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/bookmarks");
      if (!response.ok) {
        throw new Error(await readError(response, "Couldn't load the index."));
      }
      setBookmarks(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load the index.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookmarks();
  }, []);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          title,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });
      if (!response.ok) {
        throw new Error(await readError(response, "Couldn't add the entry."));
      }
      const created: Bookmark = await response.json();
      setBookmarks((current) => [created, ...current]);
      setUrl("");
      setTitle("");
      setTags("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add the entry.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      const response = await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(await readError(response, "Couldn't delete the entry."));
      }
      setBookmarks((current) => current.filter((b) => b.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete the entry.");
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-16 sm:py-24">
      <header className="rise">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
          Multi-tenant · Index
        </p>
        <h1 className="mt-4 font-display text-6xl font-medium leading-none tracking-tight sm:text-7xl">
          Bookmarks<span className="text-ink-soft">.</span>
        </h1>
        <div className="mt-6 flex items-baseline justify-between border-t border-ink pt-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
            Scoped to this session
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft tabular-nums">
            {bookmarks.length.toString().padStart(2, "0")}{" "}
            {bookmarks.length === 1 ? "entry" : "entries"}
          </span>
        </div>
      </header>

      <form
        onSubmit={handleAdd}
        className="rise mt-14"
        style={{ animationDelay: "80ms" }}
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
          New entry
        </p>

        <div className="mt-5 space-y-5">
          <div>
            <label
              htmlFor="url"
              className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft"
            >
              URL
            </label>
            <input
              id="url"
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="field mt-1"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="title"
                className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft"
              >
                Title
              </label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Example site"
                className="field mt-1"
              />
            </div>

            <div>
              <label
                htmlFor="tags"
                className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft"
              >
                Tags — optional
              </label>
              <input
                id="tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="reference, tools"
                className="field mt-1"
              />
            </div>
          </div>
        </div>

        <div className="mt-7 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="group inline-flex items-center gap-2 bg-ink px-6 py-3 font-mono text-[11px] uppercase tracking-[0.25em] text-paper transition hover:opacity-90 disabled:opacity-40"
          >
            {submitting ? "Adding" : "Add entry"}
            <span
              aria-hidden
              className="transition-transform group-hover:translate-x-1"
            >
              →
            </span>
          </button>
        </div>
      </form>

      {error && (
        <div
          role="alert"
          className="rise mt-10 bg-ink px-4 py-3 font-mono text-xs tracking-wide text-paper"
        >
          {error}
        </div>
      )}

      <section className="mt-16">
        {loading ? (
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
            Loading index…
          </p>
        ) : bookmarks.length === 0 ? (
          <p className="font-mono text-sm text-ink-soft">
            Nothing indexed yet. Add the first entry above.
          </p>
        ) : (
          <ol>
            {bookmarks.map((bookmark, index) => (
              <li
                key={bookmark.id}
                className="rise group grid grid-cols-[2rem_1fr_auto] items-baseline gap-4 border-t border-hairline py-6 last:border-b sm:gap-6"
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <span className="font-mono text-xs text-ink-soft tabular-nums">
                  {(index + 1).toString().padStart(2, "0")}
                </span>

                <div className="min-w-0">
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-display text-xl leading-snug underline-offset-4 hover:underline"
                  >
                    {bookmark.title}
                  </a>
                  <p className="mt-1 truncate font-mono text-xs text-ink-soft">
                    {displayUrl(bookmark.url)}
                  </p>
                  {bookmark.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                      {bookmark.tags.map((tag) => (
                        <span
                          key={tag}
                          className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-soft before:mr-1 before:content-['/']"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(bookmark.id)}
                  aria-label={`Delete ${bookmark.title}`}
                  className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft opacity-60 transition hover:text-ink hover:opacity-100 focus-visible:text-ink focus-visible:opacity-100"
                >
                  Delete
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}

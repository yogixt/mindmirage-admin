"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { POST_CATEGORIES } from "@/lib/journal";

/* Full composer — category, title, body, photo URL, link. */

export default function NewPostForm() {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const inputCls =
    "w-full rounded-xl border border-ink/10 bg-transparent px-4 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-saffron/60";

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      const res = await fetch("/api/newsletters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: String(fd.get("title") ?? ""),
          category: String(fd.get("category") ?? "announcement"),
          body: String(fd.get("body") ?? ""),
          link: String(fd.get("link") ?? ""),
          image: String(fd.get("image") ?? ""),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        throw new Error(
          data.error === "invalid_body"
            ? "Check the fields — title needs 5+ characters; link must be a full URL."
            : "Could not post. Please try again.",
        );
      }
      form.reset();
      setDone(true);
      setTimeout(() => setDone(false), 2500);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post.");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <select
        name="category"
        className={inputCls}
        defaultValue="announcement"
        aria-label="Category"
      >
        {POST_CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <input
        name="title"
        required
        minLength={5}
        maxLength={160}
        placeholder="Title"
        className={inputCls}
      />
      <textarea
        name="body"
        required
        minLength={5}
        rows={4}
        placeholder="Write to the satsang — news, a note, a blog…"
        className={`${inputCls} sm:col-span-2`}
      />
      <input
        name="image"
        type="url"
        placeholder="Photo URL (optional)"
        className={inputCls}
      />
      <input
        name="link"
        type="url"
        placeholder="Link (optional)"
        className={inputCls}
      />
      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={sending}
          className="rounded-full bg-saffron px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-clay disabled:opacity-60"
        >
          {sending ? "Posting…" : "Post to the feed"}
        </button>
        {done && (
          <span className="text-xs font-semibold text-green-700">
            Posted — live on the sadhaks&apos; feed.
          </span>
        )}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </form>
  );
}

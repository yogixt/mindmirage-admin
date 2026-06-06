"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATALOG } from "@/lib/constants";

/* Chips of enrolled courses with remove, plus an add-course select. */

export default function EnrolmentEditor({
  userId,
  enrolled,
}: {
  userId: string;
  enrolled: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState("");

  const change = async (slug: string, op: "add" | "remove") => {
    setBusy(true);
    try {
      await fetch("/api/sadhaks/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, slug, op }),
      });
      router.refresh();
    } finally {
      setBusy(false);
      setAdding("");
    }
  };

  const title = (slug: string) =>
    CATALOG.find((c) => c.slug === slug)?.title ?? slug;
  const available = CATALOG.filter((c) => !enrolled.includes(c.slug));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {enrolled.length === 0 && (
        <span className="text-xs text-ink-faint">No enrolments yet.</span>
      )}
      {enrolled.map((slug) => (
        <span
          key={slug}
          className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-800 ring-1 ring-green-200"
        >
          {title(slug)}
          <button
            type="button"
            disabled={busy}
            onClick={() => void change(slug, "remove")}
            aria-label={`Remove ${title(slug)}`}
            className="grid size-4 place-items-center rounded-full text-green-700 hover:bg-red-100 hover:text-red-700 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </span>
      ))}
      <select
        value={adding}
        disabled={busy}
        onChange={(e) => {
          const slug = e.target.value;
          setAdding(slug);
          if (slug) void change(slug, "add");
        }}
        className="rounded-full border border-dashed border-ink/20 bg-transparent px-3 py-1 text-xs text-ink-soft focus:outline-none focus:ring-2 focus:ring-ink disabled:opacity-50"
      >
        <option value="">+ Enrol in a course…</option>
        {available.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.title}
          </option>
        ))}
      </select>
    </div>
  );
}

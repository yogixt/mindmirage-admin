"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/* Upcoming live classes — date, IST time, Zoom link. */

export type ClassSlot = {
  id: number;
  courseSlug: string;
  course: string;
  date: string;
  time: string;
  zoomUrl: string | null;
  note: string | null;
};

function niceDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });
}

function niceTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function ScheduleManager({
  slots,
  courses,
}: {
  slots: ClassSlot[];
  courses: { slug: string; title: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [courseSlug, setCourseSlug] = useState(courses[0]?.slug ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("19:00");
  const [zoomUrl, setZoomUrl] = useState("");

  const call = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      await fetch("/api/schedule/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {slots.length === 0 ? (
        <p className="py-4 text-sm text-ink-faint">
          No classes scheduled — add the first slot below.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {slots.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#F6F7FC] p-3 ring-1 ring-[#E7EAF8]"
            >
              <span className="grid min-w-[4.5rem] shrink-0 place-items-center rounded-xl bg-white px-3 py-2 text-center text-xs font-bold text-ink shadow-sm">
                {niceDate(s.date)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{s.course}</p>
                <p className="text-xs text-ink-faint">
                  {niceTime(s.time)} IST
                  {s.note ? ` · ${s.note}` : ""}
                </p>
              </div>
              {s.zoomUrl && (
                <a
                  href={s.zoomUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="shrink-0 rounded-full border border-[#D8DEF7] bg-white px-4 py-1.5 text-xs font-semibold text-[#4356E0] transition-colors hover:bg-[#F0F3FF]"
                >
                  Go to Zoom
                </a>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => void call({ action: "delete", id: s.id })}
                aria-label="Remove slot"
                className="grid size-8 shrink-0 place-items-center rounded-full text-ink-faint transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add slot */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink/5 pt-4">
        <select
          value={courseSlug}
          onChange={(e) => setCourseSlug(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-ink/10 bg-transparent px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
        >
          {courses.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.title}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-ink/10 bg-transparent px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="rounded-xl border border-ink/10 bg-transparent px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
        />
        <input
          type="url"
          value={zoomUrl}
          onChange={(e) => setZoomUrl(e.target.value)}
          placeholder="Zoom link (optional)"
          className="min-w-0 flex-1 rounded-xl border border-ink/10 bg-transparent px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
        />
        <button
          type="button"
          disabled={busy || !date || !time}
          onClick={() => void call({ action: "add", courseSlug, date, time, zoomUrl })}
          className="rounded-full bg-gradient-to-r from-[#5B7CFA] to-[#3F51E8] px-5 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          + Add slot
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";

/* The team's master calendar.
   - Click a day to block / open it (red = blocked).
   - Amber pill: slot requests asking for that day.
   - Green pill: confirmed bookings on that day.
   - Indigo dot: a scheduled live class. */

export type DayDetail = { label: string; tone: "asked" | "conf" | "class" };

export type DayMarks = Record<
  string,
  {
    askedM?: number;
    askedE?: number;
    confM?: number;
    confE?: number;
    classes?: number;
  }
>;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ymd(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function AdminCalendar({
  initialBlocked,
  marks,
  details = {},
}: {
  initialBlocked: string[];
  marks: DayMarks;
  details?: Record<string, DayDetail[]>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string[]>(initialBlocked);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const blockedSet = useMemo(() => new Set(blocked), [blocked]);
  const todayStr = ymd(new Date());

  useEffect(() => setBlocked(initialBlocked), [initialBlocked]);

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const list: (string | null)[] = Array(startOffset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      list.push(ymd(new Date(month.getFullYear(), month.getMonth(), d)));
    }
    return list;
  }, [month]);

  const toggle = async (date: string) => {
    const nowBlocked = !blockedSet.has(date);
    setBlocked((prev) =>
      nowBlocked ? [...prev, date].sort() : prev.filter((d) => d !== date),
    );
    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, blocked: nowBlocked }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error();
    } catch {
      setBlocked((prev) =>
        nowBlocked ? prev.filter((d) => d !== date) : [...prev, date].sort(),
      );
    }
  };

  const monthLabel = month.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          className="grid size-9 place-items-center rounded-full bg-white text-ink-soft shadow-sm ring-1 ring-[#E7EAF8] transition-colors hover:text-ink"
          aria-label="Previous month"
        >
          ‹
        </button>
        <p className="text-base font-bold text-ink">{monthLabel}</p>
        <button
          type="button"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          className="grid size-9 place-items-center rounded-full bg-white text-ink-soft shadow-sm ring-1 ring-[#E7EAF8] transition-colors hover:text-ink"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="pb-1 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
            {w}
          </span>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((date, i) => {
          if (!date) return <span key={`x${i}`} />;
          const past = date < todayStr;
          const isBlocked = blockedSet.has(date);
          const isToday = date === todayStr;
          const m = marks[date] ?? {};
          const day = Number(date.slice(8, 10));

          return (
            <button
              key={date}
              type="button"
              disabled={past}
              onClick={() => setSelected(selected === date ? null : date)}
              title="Click for details"
              className={`flex min-h-[3.6rem] flex-col items-start gap-0.5 rounded-xl p-1.5 text-left ring-1 transition-all sm:min-h-[4.2rem] ${
                past
                  ? "bg-transparent text-ink-faint/40 ring-transparent cursor-not-allowed"
                  : isBlocked
                    ? `bg-rose-50 ring-rose-200 hover:ring-rose-300 ${selected === date ? "ring-2 ring-rose-400" : ""}`
                    : `bg-white ring-[#E7EAF8] hover:ring-[#5B7CFA]/50 ${selected === date ? "ring-2 ring-[#5B7CFA]" : ""}`
              }`}
            >
              <span
                className={`grid size-5 place-items-center rounded-full text-[11px] font-bold ${
                  isToday
                    ? "bg-gradient-to-br from-[#5B7CFA] to-[#3F51E8] text-white"
                    : isBlocked && !past
                      ? "text-rose-600"
                      : "text-ink"
                }`}
              >
                {day}
              </span>
              {!past && (
                <span className="flex flex-wrap gap-0.5">
                  {isBlocked && (
                    <span className="rounded-full bg-rose-500 px-1.5 text-[9px] font-bold leading-4 text-white">
                      blocked
                    </span>
                  )}
                  {m.askedM ? (
                    <span className="rounded-full bg-amber-100 px-1.5 text-[9px] font-bold leading-4 text-amber-700">
                      {m.askedM} morn?
                    </span>
                  ) : null}
                  {m.askedE ? (
                    <span className="rounded-full bg-amber-100 px-1.5 text-[9px] font-bold leading-4 text-amber-700">
                      {m.askedE} eve?
                    </span>
                  ) : null}
                  {m.confM ? (
                    <span className="rounded-full bg-emerald-500 px-1.5 text-[9px] font-bold leading-4 text-white">
                      {m.confM} morning
                    </span>
                  ) : null}
                  {m.confE ? (
                    <span className="rounded-full bg-emerald-600 px-1.5 text-[9px] font-bold leading-4 text-white">
                      {m.confE} evening
                    </span>
                  ) : null}
                  {m.classes ? (
                    <span className="rounded-full bg-[#E8EBFD] px-1.5 text-[9px] font-bold leading-4 text-[#4356E0]">
                      {m.classes} live
                    </span>
                  ) : null}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day — full detail */}
      {selected && (
        <div className="mt-4 rounded-2xl bg-[#F6F7FC] p-4 ring-1 ring-[#E7EAF8]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-ink">
              {new Date(`${selected}T00:00:00`).toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <button
              type="button"
              onClick={() => void toggle(selected)}
              className={`rounded-full px-4 py-1.5 text-[11px] font-bold transition-colors ${
                blockedSet.has(selected)
                  ? "bg-emerald-500 text-white hover:bg-emerald-600"
                  : "bg-rose-500 text-white hover:bg-rose-600"
              }`}
            >
              {blockedSet.has(selected) ? "Open this day" : "Block this day"}
            </button>
          </div>
          {(details[selected] ?? []).length === 0 ? (
            <p className="mt-2 text-xs text-ink-faint">
              Nothing booked on this day.
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {(details[selected] ?? []).map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-ink-soft">
                  <span
                    className={`mt-1 size-2 shrink-0 rounded-full ${
                      d.tone === "conf"
                        ? "bg-emerald-500"
                        : d.tone === "asked"
                          ? "bg-amber-400"
                          : "bg-[#5B7CFA]"
                    }`}
                    aria-hidden
                  />
                  <span>
                    {d.label}
                    {d.tone === "asked" && (
                      <span className="ml-1 text-ink-faint">(requested — approve in Bookings)</span>
                    )}
                    {d.tone === "conf" && (
                      <span className="ml-1 font-semibold text-emerald-600">confirmed</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-rose-400" /> Blocked · click a day for details and to block/open
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-amber-400" /> Slot requests
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-emerald-500" /> Confirmed bookings
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#5B7CFA]" /> Scheduled live classes
        </span>
      </div>
    </div>
  );
}

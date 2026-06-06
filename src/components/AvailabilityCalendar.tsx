"use client";

import { useEffect, useMemo, useState } from "react";
import { tithiForDate } from "@/lib/panchanga";

/* Month calendar — blocked dates red, available green.
   mode="select": seekers pick available dates (up to maxSelect).
   mode="manage": the team clicks any date to toggle blocked/available. */

type Props = {
  mode: "select" | "manage";
  blocked: string[];
  selected?: string[];
  maxSelect?: number;
  onSelect?: (dates: string[]) => void;
  onToggle?: (date: string, blocked: boolean) => void;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ymd(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function AvailabilityCalendar({
  mode,
  blocked,
  selected = [],
  maxSelect = 5,
  onSelect,
  onToggle,
}: Props) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const blockedSet = useMemo(() => new Set(blocked), [blocked]);
  const todayStr = ymd(new Date());

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const startOffset = first.getDay(); // Sunday-first
    const daysInMonth = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
    ).getDate();
    const list: (string | null)[] = Array(startOffset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      list.push(ymd(new Date(month.getFullYear(), month.getMonth(), d)));
    }
    return list;
  }, [month]);

  const monthName = month.toLocaleDateString("en-IN", { month: "long" });
  const yearLabel = month.getFullYear();

  // Hindu (Indian national) calendar — today's date and day.
  const now = new Date();
  const hinduDate = new Intl.DateTimeFormat("en-IN-u-ca-indian", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
  const hinduDay = new Intl.DateTimeFormat("hi-IN", { weekday: "long" }).format(now);
  const todayTithi = tithiForDate(todayStr);

  const click = (date: string) => {
    if (date < todayStr) return;
    if (mode === "manage") {
      onToggle?.(date, !blockedSet.has(date));
      return;
    }
    if (blockedSet.has(date)) return;
    const isSelected = selected.includes(date);
    if (isSelected) {
      onSelect?.(selected.filter((d) => d !== date));
    } else if (selected.length < maxSelect) {
      onSelect?.([...selected, date].sort());
    }
  };

  return (
    <div className="w-full max-w-[320px] p-1">
      {/* Month header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
          className="grid size-8 place-items-center rounded-full text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink"
          aria-label="Previous month"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <p className="text-sm font-semibold text-ink">
          <span className="text-saffron">{monthName}</span>
          <span className="text-ink-faint"> / </span>
          {yearLabel}
        </p>
        <button
          type="button"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
          className="grid size-8 place-items-center rounded-full text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink"
          aria-label="Next month"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      {/* Hindu calendar — day, tithi, date */}
      <p className="deva mt-1 text-center text-[11px] text-ink-soft">
        {hinduDay} · <span className="text-saffron">{todayTithi.name}</span> ·{" "}
        <span className="text-ink-faint">{hinduDate} (Saka)</span>
      </p>

      {/* Weekdays */}
      <div className="mt-4 grid grid-cols-7 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-[11px] font-semibold text-ink">
            {w}
          </span>
        ))}
      </div>

      {/* Days — plain numbers; picks fill in */}
      <div className="mt-1 grid grid-cols-7 gap-y-1">
        {cells.map((date, i) => {
          if (!date) return <span key={`x${i}`} />;
          const past = date < todayStr;
          const isBlocked = blockedSet.has(date);
          const isSelected = selected.includes(date);
          const day = Number(date.slice(8, 10));
          const tithi = tithiForDate(date);

          let cls =
            "relative mx-auto grid size-8 place-items-center rounded-lg text-[12px] font-medium transition-all ";
          if (past) {
            cls += "text-ink-faint/40 cursor-not-allowed";
          } else if (isBlocked) {
            cls +=
              mode === "manage"
                ? "bg-red-500 text-white shadow-sm cursor-pointer hover:bg-red-600"
                : "text-red-400 line-through cursor-not-allowed";
          } else if (isSelected) {
            cls += "bg-green-600 text-white shadow-sm cursor-pointer";
          } else {
            cls += "text-ink cursor-pointer hover:bg-paper-deep";
          }

          return (
            <button
              key={date}
              type="button"
              disabled={past || (mode === "select" && isBlocked)}
              onClick={() => click(date)}
              className={cls}
              aria-pressed={mode === "select" ? isSelected : isBlocked}
              title={tithi.name}
            >
              {day}
              {(tithi.isPurnima || tithi.isAmavasya || tithi.isEkadashi) && (
                <span
                  aria-hidden
                  className={`absolute bottom-[3px] left-1/2 size-[5px] -translate-x-1/2 rounded-full ${
                    tithi.isPurnima
                      ? "bg-gold ring-1 ring-gold/40"
                      : tithi.isAmavasya
                        ? "bg-ink/80"
                        : isSelected
                          ? "bg-white"
                          : "bg-saffron"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tithi legend */}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-ink-faint">
        <span className="flex items-center gap-1">
          <span className="size-[5px] rounded-full bg-gold" /> Pūrṇimā
        </span>
        <span className="flex items-center gap-1">
          <span className="size-[5px] rounded-full bg-ink/80" /> Amāvasyā
        </span>
        <span className="flex items-center gap-1">
          <span className="size-[5px] rounded-full bg-saffron" /> Ekādaśī
        </span>
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center gap-4 border-t border-ink/5 pt-3 text-[11px] text-ink-soft">
        {mode === "select" ? (
          <>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-green-600" /> Your pick
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-red-500" /> Blocked
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-red-500" /> Blocked
            </span>
            <span>Tap a date to block or open it.</span>
          </>
        )}
      </div>
    </div>
  );
}

/* Fetch helper shared by both consumers. */
export function useBlockedDates() {
  const [blocked, setBlocked] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/availability")
      .then((r) => r.json())
      .then((d) => d.ok && setBlocked(d.blocked))
      .catch(() => {});
  }, []);
  return [blocked, setBlocked] as const;
}

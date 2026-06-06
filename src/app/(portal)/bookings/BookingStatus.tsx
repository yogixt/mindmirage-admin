"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/* Approve one or many of the sadhak's requested dates, or decline. */

function niceDay(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function BookingStatus({
  id,
  status,
  dates,
  approvedDate,
}: {
  id: number;
  status: string;
  dates: string;
  approvedDate: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const requested = dates
    .split(",")
    .map((d) => d.trim())
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));

  const set = async (newStatus: string, approvedDates?: string[]) => {
    setBusy(true);
    try {
      await fetch("/api/bookings/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus, approvedDates }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  if (status === "approved") {
    const confirmed = (approvedDate ?? "")
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    return (
      <div className="shrink-0 text-right">
        <div className="flex flex-wrap justify-end gap-1.5">
          {confirmed.map((d) => (
            <span
              key={d}
              className="rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-white"
            >
              {niceDay(d)}
            </span>
          ))}
        </div>
        <p className="mt-1 text-[11px] font-semibold text-emerald-600">
          Confirmed · {confirmed.length} class{confirmed.length > 1 ? "es" : ""}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void set("new")}
          className="mt-0.5 text-[11px] font-semibold text-ink-faint hover:text-ink disabled:opacity-50"
        >
          Undo
        </button>
      </div>
    );
  }

  if (status === "declined") {
    return (
      <div className="shrink-0 text-right">
        <span className="rounded-full bg-rose-50 px-4 py-1.5 text-xs font-semibold text-rose-600 ring-1 ring-rose-200">
          Declined
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={() => void set("new")}
          className="mt-1.5 block w-full text-right text-[11px] font-semibold text-ink-faint hover:text-ink disabled:opacity-50"
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0">
      <p className="mb-1.5 text-right text-[11px] font-semibold text-ink-faint">
        Tap dates to approve:
      </p>
      <div className="flex flex-wrap justify-end gap-1.5">
        {requested.map((d) => {
          const on = picked.includes(d);
          return (
            <button
              key={d}
              type="button"
              disabled={busy}
              onClick={() =>
                setPicked((p) => (on ? p.filter((x) => x !== d) : [...p, d].sort()))
              }
              className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors disabled:opacity-50 ${
                on
                  ? "bg-emerald-500 text-white"
                  : "bg-[#F6F7FC] text-ink ring-1 ring-[#E7EAF8] hover:ring-emerald-300"
              }`}
            >
              {niceDay(d)}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex justify-end gap-1.5">
        <button
          type="button"
          disabled={busy || picked.length === 0}
          onClick={() => void set("approved", picked)}
          className="rounded-full bg-emerald-500 px-4 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
        >
          Confirm {picked.length > 0 ? `${picked.length} date${picked.length > 1 ? "s" : ""}` : ""}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void set("declined")}
          className="rounded-full border border-rose-200 px-3 py-1.5 text-[11px] font-semibold text-rose-500 transition-colors hover:bg-rose-50 disabled:opacity-50"
        >
          Decline
        </button>
      </div>
    </div>
  );
}

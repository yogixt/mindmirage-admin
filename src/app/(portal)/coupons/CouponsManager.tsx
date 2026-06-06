"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Coupon = { code: string; percent: number; active: boolean; createdAt: string };

export default function CouponsManager({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/coupons/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) throw new Error();
      router.refresh();
    } catch {
      setError("Could not save — check the code (letters and numbers only).");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {coupons.length > 0 && (
        <ul className="mb-5 divide-y divide-ink/5">
          {coupons.map((c) => (
            <li key={c.code} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-lg px-3 py-1 font-mono text-sm font-bold tracking-wider ${
                    c.active
                      ? "bg-green-50 text-green-800 ring-1 ring-green-200"
                      : "bg-ink/5 text-ink-faint line-through"
                  }`}
                >
                  {c.code}
                </span>
                <span className="text-sm font-semibold text-saffron">
                  {c.percent}% off
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void call({ action: "toggle", code: c.code })}
                  className="rounded-full border border-ink/15 px-4 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
                >
                  {c.active ? "Pause" : "Activate"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (confirm(`Delete ${c.code}?`)) void call({ action: "delete", code: c.code });
                  }}
                  className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-3 border-t border-ink/5 pt-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-faint">
            New code
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="DIWALI25"
            className="w-40 rounded-xl border border-ink/10 bg-transparent px-4 py-2.5 font-mono text-sm uppercase text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-saffron/60"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-faint">
            Percent off
          </label>
          <input
            type="number"
            min={1}
            max={100}
            value={percent}
            onChange={(e) => setPercent(Number(e.target.value))}
            className="w-24 rounded-xl border border-ink/10 bg-transparent px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-saffron/60"
          />
        </div>
        <button
          type="button"
          disabled={busy || code.trim().length < 2}
          onClick={() => void call({ action: "add", code: code.trim(), percent })}
          className="rounded-full bg-green-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
        >
          Add coupon
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}

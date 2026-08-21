"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type ReconcileResult = {
  ok: boolean;
  error?: string;
  windowDays?: number;
  capturedPaymentsChecked?: number;
  newlyRecorded?: { paymentId: string; email: string; amountINR: number; items: string }[];
};

/* Triggers a sweep of Razorpay's own payment history for the last N days
   against our `orders` table — catches anything a paying seeker's browser
   dropped before it reached us, and anything a webhook delivery missed.
   Safe to run any time: every write on the mindmirage side is idempotent. */
export default function ReconcilePanel() {
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReconcileResult | null>(null);

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/orders/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      const data = (await res.json()) as ReconcileResult;
      setResult(data);
    } catch {
      setResult({ ok: false, error: "network_error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-ink-soft">
          Last
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="mx-1.5 rounded-lg border border-ink/10 bg-white px-2 py-1 text-xs font-semibold text-ink"
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={180}>180 days</option>
          </select>
          against Razorpay
        </label>
        <button
          onClick={run}
          disabled={busy}
          className="rounded-full bg-[#4356E0] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#3646c9] disabled:opacity-60"
        >
          {busy ? "Checking Razorpay…" : "Reconcile payments"}
        </button>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-md rounded-2xl border p-4 text-right text-xs"
            style={{
              borderColor: result.ok ? "#D9E4D9" : "#F5D5D0",
              backgroundColor: result.ok ? "#F3FAF3" : "#FDF2F1",
            }}
          >
            {!result.ok ? (
              <p className="font-semibold text-rose-700">
                Reconcile failed — {result.error ?? "unknown error"}
              </p>
            ) : result.newlyRecorded && result.newlyRecorded.length > 0 ? (
              <div className="text-left">
                <p className="font-semibold text-emerald-700">
                  Found {result.newlyRecorded.length} payment
                  {result.newlyRecorded.length > 1 ? "s" : ""} Razorpay captured but we never
                  recorded — now fixed.
                </p>
                <ul className="mt-2 space-y-1">
                  {result.newlyRecorded.map((p) => (
                    <li key={p.paymentId} className="text-ink-soft">
                      <span className="font-semibold text-ink">
                        ₹{p.amountINR.toLocaleString("en-IN")}
                      </span>{" "}
                      · {p.items} · {p.email || "no email"}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-ink-faint">
                  Checked {result.capturedPaymentsChecked} captured payments from the last{" "}
                  {result.windowDays} days. Refresh to see them below.
                </p>
              </div>
            ) : (
              <p className="text-emerald-700">
                All {result.capturedPaymentsChecked} captured payments from the last{" "}
                {result.windowDays} days are already recorded. Nothing missing.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

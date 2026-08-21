"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Pencil, RotateCcw, Ban, CheckCircle2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "../ui";

export type Membership = {
  id: number;
  sadhakName: string;
  sadhakEmail: string | null;
  courseLabel: string;
  startsOn: string;
  durationLabel: string;
  durationDays: number | null;
  expiresOn: string | null;
  notes: string | null;
  status: "active" | "cancelled";
};

type Preset = "1_week" | "1_month" | "3_months" | "6_months" | "1_year" | "lifetime" | "custom";

const PRESETS: { value: Preset; label: string }[] = [
  { value: "1_week", label: "1 week" },
  { value: "1_month", label: "1 month" },
  { value: "3_months", label: "3 months" },
  { value: "6_months", label: "6 months" },
  { value: "1_year", label: "1 year" },
  { value: "lifetime", label: "Lifetime" },
  { value: "custom", label: "Custom" },
];

function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
const TODAY = ymd(new Date());

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86_400_000,
  );
}

function niceDate(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* Status derived purely from dates + the cancelled flag — never stored, so
   it's always correct without a cron flipping rows at midnight. */
function statusOf(m: Membership): {
  key: "cancelled" | "lifetime" | "expired" | "urgent" | "soon" | "healthy";
  label: string;
  dot: string;
  chip: string;
} {
  if (m.status === "cancelled") {
    return { key: "cancelled", label: "Cancelled", dot: "bg-slate-400", chip: "bg-slate-100 text-slate-500" };
  }
  if (!m.expiresOn) {
    return { key: "lifetime", label: "Lifetime", dot: "bg-[#5B7CFA]", chip: "bg-[#EEF1FE] text-[#4356E0]" };
  }
  const remaining = daysBetween(TODAY, m.expiresOn);
  if (remaining < 0) {
    return {
      key: "expired",
      label: `Expired ${Math.abs(remaining)}d ago`,
      dot: "bg-rose-500",
      chip: "bg-rose-50 text-rose-600",
    };
  }
  if (remaining <= 7) {
    return { key: "urgent", label: `${remaining}d left`, dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700" };
  }
  if (remaining <= 30) {
    return { key: "soon", label: `${remaining}d left`, dot: "bg-yellow-400", chip: "bg-yellow-50 text-yellow-700" };
  }
  return { key: "healthy", label: `${remaining}d left`, dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700" };
}

type FormState = {
  sadhakName: string;
  sadhakEmail: string;
  courseLabel: string;
  startsOn: string;
  preset: Preset;
  customDays: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  sadhakName: "",
  sadhakEmail: "",
  courseLabel: "",
  startsOn: TODAY,
  preset: "1_year",
  customDays: "90",
  notes: "",
};

function durationPayload(f: Pick<FormState, "preset" | "customDays">) {
  if (f.preset === "custom") {
    return { preset: "custom" as const, days: Math.max(1, Number(f.customDays) || 1) };
  }
  return { preset: f.preset as Exclude<Preset, "custom"> };
}

const PRESET_DAYS: Record<Exclude<Preset, "lifetime" | "custom">, number> = {
  "1_week": 7,
  "1_month": 30,
  "3_months": 90,
  "6_months": 180,
  "1_year": 365,
};

function presetFromDays(days: number | null): Preset {
  if (days === null) return "lifetime";
  const match = (Object.entries(PRESET_DAYS) as [Preset, number][]).find(([, n]) => n === days);
  return match ? match[0] : "custom";
}

export default function MembershipsClient({ memberships }: { memberships: Membership[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [panel, setPanel] = useState<{ mode: "add" | "edit"; id?: number } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "urgent" | "expired" | "lifetime" | "cancelled">("all");
  const [renewing, setRenewing] = useState<number | null>(null);
  const [renewPreset, setRenewPreset] = useState<Preset>("1_year");

  const call = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/memberships/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) throw new Error();
      router.refresh();
      return true;
    } catch {
      setError("Something went wrong — try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setPanel({ mode: "add" });
  };

  const openEdit = (m: Membership) => {
    setForm({
      sadhakName: m.sadhakName,
      sadhakEmail: m.sadhakEmail ?? "",
      courseLabel: m.courseLabel,
      startsOn: m.startsOn,
      preset: presetFromDays(m.durationDays),
      customDays: String(m.durationDays ?? 90),
      notes: m.notes ?? "",
    });
    setPanel({ mode: "edit", id: m.id });
  };

  const submit = async () => {
    if (!form.sadhakName.trim() || !form.courseLabel.trim() || !form.startsOn) {
      setError("Name, course, and start date are required.");
      return;
    }
    const ok = await call({
      action: panel?.mode === "edit" ? "edit" : "add",
      id: panel?.id,
      sadhakName: form.sadhakName.trim(),
      sadhakEmail: form.sadhakEmail.trim(),
      courseLabel: form.courseLabel.trim(),
      startsOn: form.startsOn,
      duration: durationPayload(form),
      notes: form.notes.trim(),
    });
    if (ok) setPanel(null);
  };

  const doRenew = async (id: number) => {
    const m = memberships.find((x) => x.id === id);
    if (!m) return;
    const from = m.expiresOn && m.expiresOn > TODAY ? m.expiresOn : TODAY;
    const ok = await call({
      action: "renew",
      id,
      duration: renewPreset === "custom" ? { preset: "custom", days: 90 } : { preset: renewPreset },
      from,
    });
    if (ok) setRenewing(null);
  };

  // ── Calendar ──
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

  const expiryByDate = useMemo(() => {
    const map = new Map<string, Membership[]>();
    for (const m of memberships) {
      if (m.status !== "active" || !m.expiresOn) continue;
      const list = map.get(m.expiresOn) ?? [];
      list.push(m);
      map.set(m.expiresOn, list);
    }
    return map;
  }, [memberships]);

  const monthName = month.toLocaleDateString("en-IN", { month: "long" });

  // ── List filtering ──
  const visible = useMemo(() => {
    let list = memberships;
    if (selectedDate) list = list.filter((m) => m.expiresOn === selectedDate);
    if (filter !== "all") list = list.filter((m) => statusOf(m).key === filter || (filter === "urgent" && statusOf(m).key === "soon"));
    return [...list].sort((a, b) => {
      const rank = (m: Membership) => (m.expiresOn ? new Date(m.expiresOn).getTime() : Infinity);
      return rank(a) - rank(b);
    });
  }, [memberships, selectedDate, filter]);

  return (
    <div>
      {/* ── Calendar + Add trigger ── */}
      <Card delay={0.1} className="mb-6 overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/5 bg-gradient-to-r from-[#F7F8FF] to-white px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              className="grid size-8 place-items-center rounded-full text-ink-soft transition-colors hover:bg-white hover:text-[#4356E0] hover:shadow-sm"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-base font-bold text-ink">
              {monthName} <span className="text-ink-faint">{month.getFullYear()}</span>
            </p>
            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              className="grid size-8 place-items-center rounded-full text-ink-soft transition-colors hover:bg-white hover:text-[#4356E0] hover:shadow-sm"
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#5B7CFA] to-[#3F51E8] px-4 py-2 text-xs font-semibold text-white shadow-[0_8px_20px_-6px_rgba(79,90,230,0.6)] transition-transform hover:-translate-y-0.5"
          >
            <Plus size={14} /> Add membership
          </button>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-7 text-center">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
              <span key={w} className="text-[11px] font-semibold text-ink-faint">
                {w}
              </span>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1.5">
            {cells.map((date, i) => {
              if (!date) return <div key={`x${i}`} />;
              const day = Number(date.slice(8, 10));
              const entries = expiryByDate.get(date) ?? [];
              const isToday = date === TODAY;
              const isSelected = date === selectedDate;
              const urgent = entries.some((e) => {
                const r = daysBetween(TODAY, e.expiresOn!);
                return r <= 7;
              });
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedDate(isSelected ? null : date)}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-[13px] font-medium transition-all ${
                    isSelected
                      ? "bg-gradient-to-br from-[#5B7CFA] to-[#3F51E8] text-white shadow-[0_8px_20px_-8px_rgba(79,90,230,0.7)]"
                      : isToday
                        ? "bg-[#EEF1FE] text-[#4356E0] ring-1 ring-[#5B7CFA]/40"
                        : "text-ink hover:bg-[#F5F6FE]"
                  }`}
                >
                  {day}
                  {entries.length > 0 && (
                    <span
                      className={`mt-0.5 rounded-full px-1.5 text-[9px] font-bold ${
                        isSelected
                          ? "bg-white/25 text-white"
                          : urgent
                            ? "bg-amber-100 text-amber-700"
                            : "bg-[#EEF1FE] text-[#4356E0]"
                      }`}
                    >
                      {entries.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-ink/5 pt-3 text-[11px] text-ink-soft">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-amber-400" /> Expiring within 7 days
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#5B7CFA]" /> Later expiries
            </span>
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="ml-auto flex items-center gap-1 rounded-full bg-ink/5 px-3 py-1 font-semibold text-ink-soft hover:bg-ink/10"
              >
                <X size={11} /> Clear {niceDate(selectedDate)}
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* ── Add / Edit panel ── */}
      <AnimatePresence>
        {panel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card delay={0} className="mb-6 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-ink">
                  {panel.mode === "edit" ? "Edit membership" : "Add membership"}
                </h2>
                <button
                  type="button"
                  onClick={() => setPanel(null)}
                  className="grid size-7 place-items-center rounded-full text-ink-faint hover:bg-ink/5 hover:text-ink"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-faint">
                    Sadhak name
                  </label>
                  <input
                    value={form.sadhakName}
                    onChange={(e) => setForm({ ...form, sadhakName: e.target.value })}
                    className="w-full rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-[#5B7CFA]/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-faint">
                    Email (optional)
                  </label>
                  <input
                    value={form.sadhakEmail}
                    onChange={(e) => setForm({ ...form, sadhakEmail: e.target.value })}
                    type="email"
                    className="w-full rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-[#5B7CFA]/50"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-faint">
                    Course / program
                  </label>
                  <input
                    value={form.courseLabel}
                    onChange={(e) => setForm({ ...form, courseLabel: e.target.value })}
                    placeholder="e.g. Bhagavad Gītā, Meditation Level 1…"
                    className="w-full rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-[#5B7CFA]/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-faint">
                    Starts on
                  </label>
                  <input
                    value={form.startsOn}
                    onChange={(e) => setForm({ ...form, startsOn: e.target.value })}
                    type="date"
                    className="w-full rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-[#5B7CFA]/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-faint">
                    Duration
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={form.preset}
                      onChange={(e) => setForm({ ...form, preset: e.target.value as Preset })}
                      className="flex-1 rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-[#5B7CFA]/50"
                    >
                      {PRESETS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    {form.preset === "custom" && (
                      <input
                        value={form.customDays}
                        onChange={(e) => setForm({ ...form, customDays: e.target.value })}
                        type="number"
                        min={1}
                        placeholder="days"
                        className="w-24 rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-[#5B7CFA]/50"
                      />
                    )}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-faint">
                    Notes (optional)
                  </label>
                  <input
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Paid offline, complimentary access, etc."
                    className="w-full rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-[#5B7CFA]/50"
                  />
                </div>
              </div>

              {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={submit}
                  className="rounded-full bg-gradient-to-r from-[#5B7CFA] to-[#3F51E8] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {panel.mode === "edit" ? "Save changes" : "Add membership"}
                </button>
                <button
                  type="button"
                  onClick={() => setPanel(null)}
                  className="rounded-full border border-ink/10 px-6 py-2.5 text-sm font-semibold text-ink-soft hover:border-ink/20"
                >
                  Cancel
                </button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Filter chips ── */}
      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            { key: "all", label: "All" },
            { key: "urgent", label: "Expiring soon" },
            { key: "expired", label: "Expired" },
            { key: "lifetime", label: "Lifetime" },
            { key: "cancelled", label: "Cancelled" },
          ] as const
        ).map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              filter === f.key
                ? "bg-ink text-white"
                : "bg-white text-ink-soft ring-1 ring-ink/10 hover:ring-ink/20"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── List ── */}
      <Card delay={0.15} className="overflow-x-auto p-0">
        {visible.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-faint">Nothing here.</p>
        ) : (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink/5 text-xs uppercase tracking-wider text-ink-faint">
                <th className="px-5 py-3 font-semibold">Sadhak</th>
                <th className="px-5 py-3 font-semibold">Course</th>
                <th className="px-5 py-3 font-semibold">Started</th>
                <th className="px-5 py-3 font-semibold">Duration</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((m) => {
                const s = statusOf(m);
                return (
                  <tr key={m.id} className="border-b border-ink/5 last:border-0 hover:bg-[#FAFBFF]">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-ink">{m.sadhakName}</p>
                      {m.sadhakEmail && <p className="text-xs text-ink-faint">{m.sadhakEmail}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-ink-soft">{m.courseLabel}</td>
                    <td className="px-5 py-3.5 text-xs text-ink-faint">{niceDate(m.startsOn)}</td>
                    <td className="px-5 py-3.5 text-ink-soft">
                      {m.durationLabel}
                      {m.expiresOn && (
                        <p className="text-xs text-ink-faint">until {niceDate(m.expiresOn)}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${s.chip}`}>
                        <span className={`size-1.5 rounded-full ${s.dot}`} />
                        {s.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {renewing === m.id ? (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={renewPreset}
                              onChange={(e) => setRenewPreset(e.target.value as Preset)}
                              className="rounded-lg border border-ink/10 bg-white px-2 py-1 text-xs"
                            >
                              {PRESETS.filter((p) => p.value !== "custom").map((p) => (
                                <option key={p.value} value={p.value}>
                                  {p.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => doRenew(m.id)}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setRenewing(null)}
                              className="grid size-6 place-items-center rounded-lg text-ink-faint hover:bg-ink/5"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              title="Renew"
                              onClick={() => {
                                setRenewing(m.id);
                                setRenewPreset("1_year");
                              }}
                              className="grid size-7 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                            >
                              <RotateCcw size={14} />
                            </button>
                            <button
                              type="button"
                              title="Edit"
                              onClick={() => openEdit(m)}
                              className="grid size-7 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-[#EEF1FE] hover:text-[#4356E0]"
                            >
                              <Pencil size={14} />
                            </button>
                            {m.status === "active" ? (
                              <button
                                type="button"
                                title="Cancel"
                                disabled={busy}
                                onClick={() => call({ action: "cancel", id: m.id })}
                                className="grid size-7 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-amber-50 hover:text-amber-600"
                              >
                                <Ban size={14} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                title="Reactivate"
                                disabled={busy}
                                onClick={() => call({ action: "reactivate", id: m.id })}
                                className="grid size-7 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                              >
                                <CheckCircle2 size={14} />
                              </button>
                            )}
                            <button
                              type="button"
                              title="Delete"
                              disabled={busy}
                              onClick={() => {
                                if (confirm(`Delete ${m.sadhakName}'s ${m.courseLabel} entry?`)) {
                                  call({ action: "delete", id: m.id });
                                }
                              }}
                              className="grid size-7 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

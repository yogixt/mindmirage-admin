"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Pencil,
  RotateCcw,
  Ban,
  CheckCircle2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  MoreVertical,
  Users,
  Clock3,
  AlertTriangle,
  Sparkles,
  CalendarDays,
} from "lucide-react";
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

function durationPayload(f: { preset: Preset; customDays: string }) {
  if (f.preset === "custom") {
    return { preset: "custom" as const, days: Math.max(1, Number(f.customDays) || 1) };
  }
  return { preset: f.preset as Exclude<Preset, "custom"> };
}

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

const AVATAR_COLORS = [
  "from-[#5B7CFA] to-[#3F51E8]",
  "from-teal-400 to-teal-600",
  "from-rose-400 to-rose-500",
  "from-amber-400 to-orange-500",
  "from-violet-400 to-violet-600",
  "from-sky-400 to-sky-600",
  "from-emerald-400 to-emerald-600",
];
function avatarColor(seed: string): string {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "?";
}

function Avatar({ name, size = 9 }: { name: string; size?: number }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${avatarColor(name)}`}
      style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
    >
      {initials(name)}
    </span>
  );
}

/* Status derived purely from dates + the cancelled flag — never stored, so
   it's always correct without a cron flipping rows at midnight. */
function statusOf(m: Membership): {
  key: "cancelled" | "lifetime" | "expired" | "urgent" | "healthy";
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
  if (remaining <= 14) {
    return { key: "urgent", label: `${remaining}d left`, dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700" };
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

/* Small "..." action menu — closes on outside click. */
function RowMenu({
  membership,
  busy,
  onEdit,
  onRenew,
  onCancel,
  onReactivate,
  onDelete,
}: {
  membership: Membership;
  busy: boolean;
  onEdit: () => void;
  onRenew: (preset: Preset) => void;
  onCancel: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setRenewOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="grid size-8 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-ink/5 hover:text-ink"
      >
        <MoreVertical size={16} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-9 z-20 w-52 overflow-hidden rounded-xl border border-ink/8 bg-white py-1.5 shadow-[0_16px_40px_-12px_rgba(30,41,59,0.25)]"
          >
            {renewOpen ? (
              <div className="px-3 py-2">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  Renew for
                </p>
                <div className="flex flex-col gap-0.5">
                  {PRESETS.filter((p) => p.value !== "custom").map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        onRenew(p.value);
                        setOpen(false);
                        setRenewOpen(false);
                      }}
                      className="rounded-lg px-2 py-1.5 text-left text-sm text-ink hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setRenewOpen(true)}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-ink hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <RotateCcw size={14} /> Renew
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onEdit();
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-ink hover:bg-[#EEF1FE] hover:text-[#4356E0]"
                >
                  <Pencil size={14} /> Edit details
                </button>
                {membership.status === "active" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      onCancel();
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-ink hover:bg-amber-50 hover:text-amber-700"
                  >
                    <Ban size={14} /> Cancel access
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      onReactivate();
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-ink hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    <CheckCircle2 size={14} /> Reactivate
                  </button>
                )}
                <div className="my-1 border-t border-ink/5" />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (confirm(`Delete ${membership.sadhakName}'s ${membership.courseLabel} entry?`)) onDelete();
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
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
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "urgent" | "expired" | "lifetime" | "cancelled">("all");

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
    setError(null);
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
    setError(null);
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

  const renew = async (id: number, preset: Preset) => {
    const m = memberships.find((x) => x.id === id);
    if (!m) return;
    const from = m.expiresOn && m.expiresOn > TODAY ? m.expiresOn : TODAY;
    await call({ action: "renew", id, duration: { preset }, from });
  };

  // ── Overview numbers ──
  const active = useMemo(() => memberships.filter((m) => m.status === "active"), [memberships]);
  const withStatus = useMemo(() => memberships.map((m) => ({ m, s: statusOf(m) })), [memberships]);
  const counts = useMemo(
    () => ({
      active: active.length,
      urgent: withStatus.filter((x) => x.s.key === "urgent").length,
      expired: withStatus.filter((x) => x.s.key === "expired").length,
      lifetime: withStatus.filter((x) => x.s.key === "lifetime").length,
    }),
    [active, withStatus],
  );

  const upcoming = useMemo(
    () =>
      active
        .filter((m) => m.expiresOn)
        .sort((a, b) => a.expiresOn!.localeCompare(b.expiresOn!))
        .slice(0, 5),
    [active],
  );

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
    const map = new Map<string, number>();
    for (const m of active) {
      if (!m.expiresOn) continue;
      map.set(m.expiresOn, (map.get(m.expiresOn) ?? 0) + 1);
    }
    return map;
  }, [active]);

  const monthName = month.toLocaleDateString("en-IN", { month: "long" });

  // ── List filtering ──
  const visible = useMemo(() => {
    let list = memberships;
    if (selectedDate) list = list.filter((m) => m.expiresOn === selectedDate);
    if (filter !== "all") list = list.filter((m) => statusOf(m).key === filter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          m.sadhakName.toLowerCase().includes(q) ||
          (m.sadhakEmail ?? "").toLowerCase().includes(q) ||
          m.courseLabel.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      const rank = (m: Membership) => (m.expiresOn ? new Date(m.expiresOn).getTime() : Infinity);
      return rank(a) - rank(b);
    });
  }, [memberships, selectedDate, filter, query]);

  return (
    <div>
      {/* ── Overview · Expiring soon · Calendar ── */}
      <div className="mb-6 grid gap-5 lg:grid-cols-3">
        <Card delay={0.05} className="p-5">
          <p className="mb-4 flex items-center gap-2 text-sm font-bold text-ink">
            <Users size={16} className="text-[#4356E0]" /> Overview
          </p>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-ink-soft">Active memberships</dt>
              <dd className="font-semibold text-ink">{counts.active}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-1.5 text-ink-soft">
                <AlertTriangle size={13} className="text-amber-500" /> Expiring within 14 days
              </dt>
              <dd className="font-semibold text-amber-600">{counts.urgent}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-1.5 text-ink-soft">
                <Clock3 size={13} className="text-rose-500" /> Expired, unrenewed
              </dt>
              <dd className="font-semibold text-rose-600">{counts.expired}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-1.5 text-ink-soft">
                <Sparkles size={13} className="text-[#5B7CFA]" /> Lifetime access
              </dt>
              <dd className="font-semibold text-[#4356E0]">{counts.lifetime}</dd>
            </div>
          </dl>
        </Card>

        <Card delay={0.1} className="p-5">
          <p className="mb-4 flex items-center gap-2 text-sm font-bold text-ink">
            <Clock3 size={16} className="text-[#4356E0]" /> Expiring soonest
          </p>
          {upcoming.length === 0 ? (
            <p className="text-sm text-ink-faint">Nothing expiring — all clear.</p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((m) => {
                const s = statusOf(m);
                return (
                  <li key={m.id} className="flex items-center gap-2.5">
                    <Avatar name={m.sadhakName} size={8} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{m.sadhakName}</p>
                      <p className="truncate text-xs text-ink-faint">{m.courseLabel}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${s.chip}`}>
                      {s.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card delay={0.15} className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-bold text-ink">
              <CalendarDays size={16} className="text-[#4356E0]" /> {monthName} {month.getFullYear()}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                className="grid size-6 place-items-center rounded-full text-ink-faint hover:bg-ink/5 hover:text-ink"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                className="grid size-6 place-items-center rounded-full text-ink-faint hover:bg-ink/5 hover:text-ink"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {["S", "M", "T", "W", "T", "F", "S"].map((w, i) => (
              <span key={i} className="text-[10px] font-semibold text-ink-faint">
                {w}
              </span>
            ))}
            {cells.map((date, i) => {
              if (!date) return <div key={`x${i}`} />;
              const day = Number(date.slice(8, 10));
              const count = expiryByDate.get(date) ?? 0;
              const isToday = date === TODAY;
              const isSelected = date === selectedDate;
              const urgent = count > 0 && daysBetween(TODAY, date) <= 14 && daysBetween(TODAY, date) >= 0;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedDate(isSelected ? null : date)}
                  className={`relative mx-auto grid size-8 place-items-center rounded-lg text-[12px] font-medium transition-all ${
                    isSelected
                      ? "bg-gradient-to-br from-[#5B7CFA] to-[#3F51E8] text-white shadow-sm"
                      : isToday
                        ? "bg-[#EEF1FE] text-[#4356E0] ring-1 ring-[#5B7CFA]/40"
                        : "text-ink hover:bg-[#F5F6FE]"
                  }`}
                >
                  {day}
                  {count > 0 && (
                    <span
                      className={`absolute bottom-0.5 size-1 rounded-full ${
                        isSelected ? "bg-white" : urgent ? "bg-amber-500" : "bg-[#5B7CFA]"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="mt-3 flex w-full items-center justify-center gap-1 rounded-full bg-ink/5 px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-ink/10"
            >
              <X size={11} /> Showing {niceDate(selectedDate)} only
            </button>
          )}
        </Card>
      </div>

      {/* ── Add / Edit modal ── */}
      <AnimatePresence>
        {panel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 backdrop-blur-[2px]"
            onClick={() => setPanel(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-[0_30px_80px_-20px_rgba(30,41,59,0.4)]"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-ink">
                  {panel.mode === "edit" ? "Edit membership" : "Add membership"}
                </h2>
                <button
                  type="button"
                  onClick={() => setPanel(null)}
                  className="grid size-8 place-items-center rounded-full text-ink-faint hover:bg-ink/5 hover:text-ink"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
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

              <div className="mt-5 flex gap-2">
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Memberships list ── */}
      <Card delay={0.2} className="overflow-visible p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/5 px-5 py-4">
          <p className="flex items-center gap-2 text-base font-bold text-ink">
            <Users size={17} className="text-[#4356E0]" /> Memberships
            <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs font-semibold text-ink-faint">
              {visible.length}
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, course…"
                className="w-56 rounded-full border border-ink/10 bg-white py-2 pl-8 pr-3 text-xs text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-[#5B7CFA]/40"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="rounded-full border border-ink/10 bg-white px-3 py-2 text-xs font-semibold text-ink-soft focus:outline-none focus:ring-2 focus:ring-[#5B7CFA]/40"
            >
              <option value="all">All statuses</option>
              <option value="urgent">Expiring soon</option>
              <option value="expired">Expired</option>
              <option value="lifetime">Lifetime</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              type="button"
              onClick={openAdd}
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#5B7CFA] to-[#3F51E8] px-4 py-2 text-xs font-semibold text-white shadow-[0_8px_20px_-6px_rgba(79,90,230,0.6)] transition-transform hover:-translate-y-0.5"
            >
              <Plus size={14} /> Add membership
            </button>
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="py-14 text-center text-sm text-ink-faint">
            {memberships.length === 0 ? "No memberships tracked yet." : "Nothing matches this filter."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
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
                        <div className="flex items-center gap-3">
                          <Avatar name={m.sadhakName} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink">{m.sadhakName}</p>
                            {m.sadhakEmail && (
                              <p className="truncate text-xs text-ink-faint">{m.sadhakEmail}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-ink-soft">
                        {m.courseLabel}
                        {m.notes && <p className="text-xs text-ink-faint">{m.notes}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-ink-faint">{niceDate(m.startsOn)}</td>
                      <td className="px-5 py-3.5 text-ink-soft">
                        {m.durationLabel}
                        {m.expiresOn && <p className="text-xs text-ink-faint">until {niceDate(m.expiresOn)}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${s.chip}`}>
                          <span className={`size-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <RowMenu
                          membership={m}
                          busy={busy}
                          onEdit={() => openEdit(m)}
                          onRenew={(preset) => renew(m.id, preset)}
                          onCancel={() => call({ action: "cancel", id: m.id })}
                          onReactivate={() => call({ action: "reactivate", id: m.id })}
                          onDelete={() => call({ action: "delete", id: m.id })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import { CATALOG, GUIDANCE_SUBJECTS } from "@/lib/constants";
import { journalDb } from "@/lib/journal";
import { Card, PageHeader } from "../ui";
import AdminCalendar, { type DayDetail, type DayMarks } from "./AdminCalendar";

export const metadata: Metadata = { title: "Availability" };
export const dynamic = "force-dynamic";

function niceDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function niceTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

async function loadBlocked() {
  const db = journalDb();
  if (!db) return [];
  const rs = await db.execute("SELECT date FROM blocked_dates ORDER BY date ASC");
  return rs.rows.map((r) => String(r.date));
}

async function loadMarks(): Promise<{ marks: DayMarks; details: Record<string, DayDetail[]> }> {
  const db = journalDb();
  const marks: DayMarks = {};
  const details: Record<string, DayDetail[]> = {};
  const note = (date: string, d: DayDetail) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    (details[date] ??= []).push(d);
  };
  if (!db) return { marks, details };
  const bump = (
    date: string,
    key: "askedM" | "askedE" | "confM" | "confE" | "classes",
  ) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    marks[date] = { ...marks[date], [key]: (marks[date]?.[key] ?? 0) + 1 };
  };
  const bookings = await db.execute(
    "SELECT name, subject, status, slot, preferred_dates, approved_date FROM bookings",
  );
  for (const r of bookings.rows) {
    const status = String(r.status);
    const morning = String(r.slot) === "morning-ist";
    const slotLabel = morning ? "Morning IST" : "Evening IST";
    const subject =
      GUIDANCE_SUBJECTS.find((s) => s.slug === String(r.subject))?.name ??
      String(r.subject);
    const who = `${String(r.name)} — ${subject} · ${slotLabel}`;
    if (status === "approved" && r.approved_date) {
      for (const d of String(r.approved_date).split(",")) {
        bump(d.trim(), morning ? "confM" : "confE");
        note(d.trim(), { label: who, tone: "conf" });
      }
    } else if (status === "new") {
      for (const d of String(r.preferred_dates).split(",")) {
        bump(d.trim(), morning ? "askedM" : "askedE");
        note(d.trim(), { label: who, tone: "asked" });
      }
    }
  }
  const classes = await db.execute(
    "SELECT course_slug, on_date, at_time FROM class_schedule WHERE on_date >= date('now')",
  );
  for (const r of classes.rows) {
    bump(String(r.on_date), "classes");
    const course =
      CATALOG.find((c) => c.slug === String(r.course_slug))?.title ??
      String(r.course_slug);
    note(String(r.on_date), {
      label: `Live class — ${course} at ${String(r.at_time)} IST`,
      tone: "class",
    });
  }
  return { marks, details };
}

async function loadBookedSlots() {
  const db = journalDb();
  if (!db) return [];
  const rs = await db.execute(
    "SELECT name, subject, slot, preferred_dates, status FROM bookings ORDER BY created_at DESC LIMIT 50",
  );
  return rs.rows.map((r) => ({
    name: String(r.name),
    subject: String(r.subject),
    slot: String(r.slot) === "morning-ist" ? "Morning · IST" : "Evening · IST",
    dates: String(r.preferred_dates),
    status: String(r.status),
  }));
}

async function loadUpcoming() {
  const db = journalDb();
  if (!db) return [];
  const rs = await db.execute(
    "SELECT course_slug, on_date, at_time, note FROM class_schedule WHERE on_date >= date('now') ORDER BY on_date ASC, at_time ASC LIMIT 30",
  );
  return rs.rows.map((r) => ({
    course:
      CATALOG.find((c) => c.slug === String(r.course_slug))?.title ??
      String(r.course_slug),
    date: String(r.on_date),
    time: String(r.at_time),
    note: r.note ? String(r.note) : null,
  }));
}

export default async function AdminAvailabilityPage() {
  const booked = await loadBookedSlots();
  const upcoming = await loadUpcoming();
  const blocked = await loadBlocked();
  const { marks, details } = await loadMarks();

  return (
    <>
      <PageHeader
        title="Availability"
        deva="उपलब्धता"
        sub="Tap a date to block or open it. Booked time slots and upcoming classes are listed beside the calendar."
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card delay={0.1}>
          <AdminCalendar initialBlocked={blocked} marks={marks} details={details} />
        </Card>

        <div className="space-y-6">
          {/* ── Upcoming classes ── */}
          <Card delay={0.15} className="p-0">
            <h2 className="px-5 pt-5 text-lg font-bold text-ink">
              Upcoming classes{" "}
              <span className="text-sm font-semibold text-ink-faint">
                {upcoming.length}
              </span>
            </h2>
            {upcoming.length === 0 ? (
              <p className="px-5 py-5 text-sm text-ink-faint">
                Nothing scheduled — add slots from the Assignments page.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-ink/5 pb-2">
                {upcoming.map((u, i) => (
                  <li key={i} className="flex items-center gap-3 px-5 py-2.5">
                    <span className="grid min-w-[4.2rem] shrink-0 place-items-center rounded-lg bg-[#F6F7FC] px-2 py-1.5 text-center text-[11px] font-bold text-ink ring-1 ring-[#E7EAF8]">
                      {niceDate(u.date)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {u.course}
                      </p>
                      <p className="text-xs text-ink-faint">
                        {niceTime(u.time)} IST
                        {u.note ? ` · ${u.note}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* ── Booked time slots from sadhaks ── */}
          <Card delay={0.2} className="p-0">
            <h2 className="px-5 pt-5 text-lg font-bold text-ink">
              Booked slots{" "}
              <span className="text-sm font-semibold text-ink-faint">
                {booked.length}
              </span>
            </h2>
            {booked.length === 0 ? (
              <p className="px-5 py-5 text-sm text-ink-faint">
                No slot requests yet — they arrive from the consultation form.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-ink/5 pb-2">
                {booked.map((b, i) => (
                  <li key={i} className="px-5 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">{b.name}</p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          b.slot.startsWith("Morning")
                            ? "bg-amber-50 text-amber-700"
                            : "bg-[#E8EBFD] text-[#4356E0]"
                        }`}
                      >
                        {b.slot}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {b.subject} · dates: {b.dates}
                      {b.status === "handled" && " · handled"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

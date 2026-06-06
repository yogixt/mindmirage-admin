import type { Metadata } from "next";
import { GUIDANCE_SUBJECTS } from "@/lib/constants";
import { journalDb } from "@/lib/journal";
import { Card, EmptyRow, PageHeader, Stat } from "../ui";
import BookingStatus from "./BookingStatus";

export const metadata: Metadata = { title: "Bookings" };

type BookingRow = {
  id: number;
  approvedDate: string | null;
  name: string;
  email: string;
  whatsapp: string;
  subject: string;
  slot: string;
  preferredDates: string;
  message: string;
  status: string;
  createdAt: string;
};

async function loadBookings(): Promise<BookingRow[]> {
  const db = journalDb();
  if (!db) return [];
  const rs = await db.execute(
    "SELECT * FROM bookings ORDER BY created_at DESC LIMIT 500",
  );
  return rs.rows.map((r) => ({
    id: Number(r.id),
    approvedDate: r.approved_date ? String(r.approved_date) : null,
    name: String(r.name),
    email: String(r.email),
    whatsapp: String(r.whatsapp),
    subject:
      GUIDANCE_SUBJECTS.find((s) => s.slug === String(r.subject))?.name ??
      String(r.subject),
    slot: String(r.slot) === "morning-ist" ? "Morning · IST" : "Evening · IST",
    preferredDates: String(r.preferred_dates),
    message: String(r.message ?? ""),
    status: String(r.status),
    createdAt: String(r.created_at),
  }));
}

export default async function AdminBookingsPage() {
  const bookings = await loadBookings();
  const fresh = bookings.filter((b) => b.status === "new").length;

  return (
    <>
      <PageHeader
        title="Bookings"
        deva="आरक्षण"
        sub="Class requests from the consultation and counselling forms."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Stat label="New requests" value={fresh} accent="text-red-600" delay={0.05} />
        <Stat label="All time" value={bookings.length} delay={0.1} />
      </div>

      {bookings.length === 0 ? (
        <Card delay={0.15}>
          <EmptyRow text="No booking requests yet." />
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((b, i) => (
            <Card key={b.id} delay={0.12 + Math.min(i, 8) * 0.04}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{b.name}</p>
                    {b.status === "new" && (
                      <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        New
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {b.email} · {b.whatsapp}
                  </p>
                  <p className="mt-2 text-sm">
                    <span className="font-semibold text-ink">{b.subject}</span>
                    <span className="ml-2 rounded-full bg-[#E8EBFD] px-2.5 py-0.5 text-[11px] font-semibold text-[#4356E0]">
                      {b.slot}
                    </span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                      Asked for:
                    </span>
                    {b.preferredDates
                      .split(",")
                      .map((d) => d.trim())
                      .filter(Boolean)
                      .map((d) => (
                        <span
                          key={d}
                          className="rounded-full bg-[#F6F7FC] px-2.5 py-1 text-[11px] font-semibold text-ink ring-1 ring-[#E7EAF8]"
                        >
                          {new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      ))}
                  </div>
                  {b.message && (
                    <p className="mt-1 text-sm italic text-ink-soft">
                      “{b.message}”
                    </p>
                  )}
                  <p className="mt-2 text-[11px] text-ink-faint">{b.createdAt}</p>
                </div>
                <BookingStatus id={b.id} status={b.status} dates={b.preferredDates} approvedDate={b.approvedDate} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

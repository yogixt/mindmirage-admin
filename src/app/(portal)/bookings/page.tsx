import type { Metadata } from "next";
import { GUIDANCE_SUBJECTS, scheduleForSubject } from "@/lib/constants";
import { mindMirageDb, runMigrations } from "@/lib/db";
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
  paid: boolean;
  photo: string | null;
};

async function loadBookings(): Promise<BookingRow[]> {
  await runMigrations();
  const db = mindMirageDb();
  if (!db) return [];

  const userPhotos: Map<string, string> = new Map();
  try {
    const ur = await db.execute("SELECT email, image FROM users WHERE image IS NOT NULL");
    for (const r of ur.rows) {
      const img = r.image ? String(r.image) : "";
      if (img) userPhotos.set(String(r.email).toLowerCase(), img);
    }
  } catch { /* no users table */ }
  try {
    const pr = await db.execute(
      "SELECT u.email, p.avatar FROM sadhak_profiles p JOIN users u ON u.id = p.user_id WHERE p.avatar IS NOT NULL AND p.avatar != ''",
    );
    for (const r of pr.rows) {
      const a = r.avatar ? String(r.avatar) : "";
      if (a) userPhotos.set(String(r.email).toLowerCase(), a);
    }
  } catch { /* no sadhak_profiles table */ }

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
    slot: scheduleForSubject(String(r.subject)).ist,
    preferredDates: String(r.preferred_dates),
    message: String(r.message ?? ""),
    status: String(r.status),
    createdAt: String(r.created_at),
    paid: r.paid ? Boolean(Number(r.paid)) : false,
    photo: userPhotos.get(String(r.email).toLowerCase()) ?? null,
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
        sub="Class requests from the consultation form."
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
                <div className="flex min-w-0 items-start gap-3">
                  {b.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.photo}
                      alt=""
                      className="size-10 shrink-0 rounded-full object-cover ring-2 ring-[#E7EAF8]"
                    />
                  ) : (
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#5B7CFA] to-[#3F51E8] text-sm font-bold text-white">
                      {b.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{b.name}</p>
                    {b.status === "new" && (
                      <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        New
                      </span>
                    )}
                    {b.paid ? (
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        Paid
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        Unpaid
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
                      .map((d) => d.trim().split(" ")[0])
                      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
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
                  </div>
                <BookingStatus id={b.id} status={b.status} dates={b.preferredDates} approvedDate={b.approvedDate} paid={b.paid} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

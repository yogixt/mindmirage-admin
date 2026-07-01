import type { Metadata } from "next";
import { mindMirageDb, runMigrations } from "@/lib/db";
import { Card, EmptyRow, PageHeader, Stat } from "../ui";

export const metadata: Metadata = { title: "Events" };

/* Focused view of the two live events:
   - Meditation · Level 01  → paid enrollments (Razorpay)   [item_slug 'meditation-l1']
   - Yoga Asana Classes     → WhatsApp reservations          [item_slug 'yoga-asana']
   - WhatsApp leads         → who clicked "contact on WhatsApp" [whatsapp_clicks]
   All read from the shared mindmirage-journal Turso DB. */

type MedRow = {
  id: number;
  name: string;
  email: string;
  phone: string;
  dates: string;
  amount: number | null;
  paid: boolean;
  paymentId: string | null;
  createdAt: string;
};

type YogaRow = {
  id: number;
  name: string;
  email: string;
  phone: string;
  mode: string;
  experience: string;
  dates: string;
  createdAt: string;
};

type LeadRow = {
  id: number;
  program: string;
  name: string;
  email: string;
  phone: string;
  context: string;
  createdAt: string;
};

async function load(): Promise<{ med: MedRow[]; yoga: YogaRow[]; leads: LeadRow[] }> {
  await runMigrations();
  const db = mindMirageDb();
  if (!db) return { med: [], yoga: [], leads: [] };

  let bookingRows: Record<string, unknown>[] = [];
  try {
    const rs = await db.execute(
      "SELECT * FROM bookings WHERE item_slug IN ('meditation-l1','yoga-asana') ORDER BY created_at DESC LIMIT 500",
    );
    bookingRows = rs.rows as unknown as Record<string, unknown>[];
  } catch {
    /* bookings table may be missing on a fresh DB */
  }

  const med: MedRow[] = bookingRows
    .filter((r) => String(r.item_slug) === "meditation-l1")
    .map((r) => ({
      id: Number(r.id),
      name: String(r.name ?? ""),
      email: String(r.email ?? ""),
      phone: String(r.whatsapp ?? ""),
      dates: String(r.preferred_dates ?? ""),
      amount: r.amount_inr != null ? Number(r.amount_inr) : null,
      paid: Boolean(Number(r.paid ?? 0)),
      paymentId: r.payment_id ? String(r.payment_id) : null,
      createdAt: String(r.created_at ?? ""),
    }));

  const yoga: YogaRow[] = bookingRows
    .filter((r) => String(r.item_slug) === "yoga-asana")
    .map((r) => ({
      id: Number(r.id),
      name: String(r.name ?? ""),
      email: String(r.email ?? ""),
      phone: String(r.whatsapp ?? ""),
      mode: String(r.slot ?? ""),
      experience: String(r.message ?? "").replace(/^Experience:\s*/, ""),
      dates: String(r.preferred_dates ?? ""),
      createdAt: String(r.created_at ?? ""),
    }));

  let leads: LeadRow[] = [];
  try {
    const lr = await db.execute("SELECT * FROM whatsapp_clicks ORDER BY id DESC LIMIT 500");
    leads = (lr.rows as unknown as Record<string, unknown>[]).map((r) => ({
      id: Number(r.id),
      program: String(r.program ?? ""),
      name: String(r.name ?? ""),
      email: String(r.email ?? ""),
      phone: String(r.phone ?? ""),
      context: String(r.context ?? ""),
      createdAt: String(r.created_at ?? ""),
    }));
  } catch {
    /* whatsapp_clicks table may not exist yet */
  }

  return { med, yoga, leads };
}

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

function Initial({ name }: { name: string }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#5B7CFA] to-[#3F51E8] text-sm font-bold text-white">
      {(name || "?").charAt(0).toUpperCase()}
    </span>
  );
}

export default async function AdminEventsPage() {
  const { med, yoga, leads } = await load();
  const revenue = med.filter((m) => m.paid).reduce((s, m) => s + (m.amount ?? 0), 0);
  const medPaid = med.filter((m) => m.paid).length;

  return (
    <>
      <PageHeader
        title="Events"
        deva="आयोजन"
        sub="Meditation enrollments, Yoga reservations, and WhatsApp leads."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Meditation · paid" value={medPaid} accent="text-emerald-600" delay={0.05} />
        <Stat label="Meditation · revenue" value={inr(revenue)} delay={0.1} />
        <Stat label="Yoga · reservations" value={yoga.length} accent="text-[#4356E0]" delay={0.15} />
        <Stat label="WhatsApp leads" value={leads.length} accent="text-[#128C7E]" delay={0.2} />
      </div>

      {/* ── Meditation enrollments ── */}
      <h2 className="mb-3 mt-2 text-sm font-bold uppercase tracking-wider text-ink-faint">
        Meditation · Level 01 — enrollments
      </h2>
      {med.length === 0 ? (
        <Card delay={0.05}>
          <EmptyRow text="No meditation enrollments yet." />
        </Card>
      ) : (
        <div className="space-y-3">
          {med.map((m, i) => (
            <Card key={m.id} delay={0.06 + Math.min(i, 8) * 0.03}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <Initial name={m.name} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{m.name}</p>
                      {m.paid ? (
                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                          Paid
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                          Pending
                        </span>
                      )}
                      <span className="rounded-full bg-[#E8EBFD] px-2.5 py-0.5 text-[11px] font-semibold text-[#4356E0]">
                        Meditation · Level 01
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {m.email} · {m.phone}
                    </p>
                    <p className="mt-2 text-sm text-ink-soft">
                      <span className="font-semibold text-ink">Dates:</span> {m.dates || "—"}
                    </p>
                    {m.paymentId && (
                      <p className="mt-1 text-[11px] text-ink-faint">Payment: {m.paymentId}</p>
                    )}
                    <p className="mt-2 text-[11px] text-ink-faint">{m.createdAt}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-ink">{m.amount != null ? inr(m.amount) : "—"}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Yoga reservations ── */}
      <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wider text-ink-faint">
        Yoga Asana Classes — reservations (WhatsApp follow-up)
      </h2>
      {yoga.length === 0 ? (
        <Card delay={0.05}>
          <EmptyRow text="No yoga reservations yet." />
        </Card>
      ) : (
        <div className="space-y-3">
          {yoga.map((y, i) => (
            <Card key={y.id} delay={0.06 + Math.min(i, 8) * 0.03}>
              <div className="flex min-w-0 items-start gap-3">
                <Initial name={y.name} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{y.name}</p>
                    <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Reserved
                    </span>
                    <span className="rounded-full bg-[#E8EBFD] px-2.5 py-0.5 text-[11px] font-semibold text-[#4356E0]">
                      Yoga Asana Classes
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {y.email} · {y.phone}
                  </p>
                  <p className="mt-2 text-sm text-ink-soft">
                    {y.mode && <span className="font-semibold text-ink">{y.mode}</span>}
                    {y.experience && <span className="ml-2">· {y.experience}</span>}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">
                    <span className="font-semibold text-ink">Starts:</span> {y.dates || "—"}
                  </p>
                  <p className="mt-2 text-[11px] text-ink-faint">{y.createdAt}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── WhatsApp leads ── */}
      <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wider text-ink-faint">
        WhatsApp leads — clicked to contact us
      </h2>
      {leads.length === 0 ? (
        <Card delay={0.05}>
          <EmptyRow text="No WhatsApp clicks recorded yet." />
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((l, i) => (
            <Card key={l.id} delay={0.06 + Math.min(i, 8) * 0.03}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#128C7E] text-sm font-bold text-white">
                    {(l.name || "?").charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{l.name || "Anonymous visitor"}</p>
                      <span className="rounded-full bg-[#DFF3EC] px-2.5 py-0.5 text-[11px] font-semibold capitalize text-[#128C7E]">
                        {l.program || "—"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {[l.email, l.phone].filter(Boolean).join(" · ") || "no contact details entered"}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-ink-faint">{l.createdAt}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

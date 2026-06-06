import type { Metadata } from "next";
import { journalDb } from "@/lib/journal";
import { Card, EmptyRow, PageHeader, Stat } from "../ui";

export const metadata: Metadata = { title: "Orders" };

type OrderRow = {
  id: number;
  paymentId: string;
  userName: string;
  email: string;
  items: string;
  amountINR: number;
  coupon: string | null;
  createdAt: string;
};

type PaymentEvent = {
  id: number;
  status: string;
  paymentId: string;
  orderId: string;
  userName: string;
  email: string;
  reason: string;
  createdAt: string;
};

async function loadEvents(): Promise<PaymentEvent[]> {
  const db = journalDb();
  if (!db) return [];
  const rs = await db.execute(
    "SELECT * FROM payment_events ORDER BY id DESC LIMIT 200",
  );
  return rs.rows.map((r) => ({
    id: Number(r.id),
    status: String(r.status),
    paymentId: String(r.payment_id ?? ""),
    orderId: String(r.order_id ?? ""),
    userName: String(r.user_name ?? "—"),
    email: String(r.email ?? ""),
    reason: String(r.reason ?? ""),
    createdAt: String(r.created_at),
  }));
}

async function loadOrders(): Promise<OrderRow[]> {
  const db = journalDb();
  if (!db) return [];
  const rs = await db.execute(
    "SELECT id, payment_id, user_name, email, items, amount_inr, coupon, created_at FROM orders ORDER BY created_at DESC LIMIT 500",
  );
  return rs.rows.map((r) => ({
    id: Number(r.id),
    paymentId: String(r.payment_id),
    userName: String(r.user_name ?? "—"),
    email: String(r.email ?? "—"),
    items: String(r.items),
    amountINR: Number(r.amount_inr),
    coupon: r.coupon ? String(r.coupon) : null,
    createdAt: String(r.created_at),
  }));
}

export default async function AdminOrdersPage() {
  const orders = await loadOrders();
  const events = await loadEvents();
  const revenue = orders.reduce((s, o) => s + o.amountINR, 0);
  const failed = events.filter((e) => e.status === "failed").length;
  const successful = events.filter((e) => e.status === "success").length;

  return (
    <>
      <PageHeader
        title="Orders"
        deva="क्रय"
        sub="Every purchase — who bought, which course, how much. Recorded at payment verification."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total orders" value={orders.length} delay={0.05} />
        <Stat
          label="Revenue"
          value={`₹${revenue.toLocaleString("en-IN")}`}
          accent="text-green-700"
          delay={0.1}
        />
        <Stat
          label="Successful payments"
          value={successful}
          accent="text-emerald-600"
          delay={0.15}
        />
        <Stat
          label="Failed payments"
          value={failed}
          accent={failed > 0 ? "text-rose-500" : "text-ink"}
          delay={0.2}
        />
      </div>

      <Card delay={0.2} className="overflow-x-auto p-0">
        {orders.length === 0 ? (
          <EmptyRow text="No orders yet — they appear here the moment a payment succeeds." />
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink/5 text-xs uppercase tracking-wider text-ink-faint">
                <th className="px-5 py-3 font-semibold">Sadhak</th>
                <th className="px-5 py-3 font-semibold">Courses</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Coupon</th>
                <th className="px-5 py-3 font-semibold">When</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-ink/5 last:border-0 transition-colors hover:bg-paper-warm/40"
                >
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-ink">{o.userName}</p>
                    <p className="text-xs text-ink-faint">{o.email}</p>
                  </td>
                  <td className="px-5 py-3.5 text-ink-soft">{o.items}</td>
                  <td className="px-5 py-3.5 font-bold text-green-700">
                    ₹{o.amountINR.toLocaleString("en-IN")}
                  </td>
                  <td className="px-5 py-3.5">
                    {o.coupon ? (
                      <span className="rounded-full bg-gold-soft/40 px-2 py-0.5 text-xs font-semibold text-ink">
                        {o.coupon}
                      </span>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-ink-faint">
                    {o.createdAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* ── Payment log — every attempt: success, failed, cancelled ── */}
      <div className="mt-6">
        <Card delay={0.25} className="p-0">
          <div className="px-5 pt-5">
            <h2 className="text-lg font-bold text-ink">Payment log</h2>
            <p className="mt-0.5 text-xs text-ink-soft">
              Every attempt — successful, failed, or closed without paying.
            </p>
          </div>
          {events.length === 0 ? (
            <EmptyRow text="No payment activity yet." />
          ) : (
            <ul className="mt-2 divide-y divide-ink/5 pb-2">
              {events.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      {e.userName}
                      {e.email && (
                        <span className="ml-2 font-normal text-ink-faint">
                          {e.email}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-ink-faint">
                      {e.paymentId || e.orderId || "—"}
                      {e.reason && ` · ${e.reason}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        e.status === "success"
                          ? "bg-emerald-50 text-emerald-700"
                          : e.status === "failed"
                            ? "bg-rose-50 text-rose-600"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {e.status === "success"
                        ? "Successful"
                        : e.status === "failed"
                          ? "Failed"
                          : "Cancelled"}
                    </span>
                    <p className="mt-0.5 text-[10px] text-ink-faint">
                      {e.createdAt} UTC
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

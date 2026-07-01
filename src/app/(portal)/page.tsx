import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardCheck,
  IndianRupee,
  Newspaper,
  NotebookPen,
  ShoppingBag,
  TicketPercent,
  Users,
} from "lucide-react";
import { getSeeker } from "@/lib/auth";
import { mindMirageDb } from "@/lib/db";
import { ActionCard, Card, IconStat, PageHeader } from "./ui";

export const metadata: Metadata = { title: "Dashboard" };

type Activity = {
  who: string;
  what: string;
  status: string;
  tone: "green" | "gold" | "red" | "ink";
  when: string;
};

async function loadData() {
  const db = mindMirageDb();
  const zero = {
    posts: 0, orders: 0, revenue: 0, newBookings: 0,
    pendingAssignments: 0, activeCoupons: 0, newInquiries: 0,
  };
  let stats = zero;
  const activity: Activity[] = [];
  const review: { title: string; sub: string; href: string; badge: string }[] = [];
  let sadhaks = 0;

  if (db) {
    const [statsRes, recentRes, pendRes, nbRes, sadhaksRes] = await Promise.allSettled([
      db.execute(
        `SELECT
          (SELECT COUNT(*) FROM posts) AS posts,
          (SELECT COUNT(*) FROM orders) AS orders,
          (SELECT COALESCE(SUM(amount_inr),0) FROM orders) AS revenue,
          (SELECT COUNT(*) FROM bookings WHERE status='new') AS newBookings,
          (SELECT COUNT(*) FROM assignment_submissions WHERE status='pending') AS pendingAssignments,
          (SELECT COUNT(*) FROM coupons WHERE active=1) AS activeCoupons,
          (SELECT COUNT(*) FROM form_entries WHERE status='new') AS newInquiries`,
      ),
      db.execute(
        `SELECT * FROM (
          SELECT 'order' AS kind, COALESCE(user_name,'A sadhak') AS who, items AS what,
                 'Paid ₹' || amount_inr AS status, created_at FROM orders
          UNION ALL
          SELECT 'booking', name, subject || ' · ' || slot, status, created_at FROM bookings
          UNION ALL
          SELECT 'assignment', user_name, course_slug || ' · lesson ' || lesson, status, submitted_at FROM assignment_submissions
          UNION ALL
          SELECT 'form', COALESCE(name,'Someone'), kind, status, created_at FROM form_entries
        ) ORDER BY created_at DESC LIMIT 8`,
      ),
      db.execute(
        "SELECT user_name, course_slug, lesson FROM assignment_submissions WHERE status='pending' ORDER BY submitted_at ASC LIMIT 4",
      ),
      db.execute(
        "SELECT name, subject, slot FROM bookings WHERE status='new' ORDER BY created_at ASC LIMIT 4",
      ),
      db.execute("SELECT COUNT(*) AS cnt FROM users"),
    ]);

    if (statsRes.status === "fulfilled") {
      const r = statsRes.value.rows[0];
      stats = {
        posts: Number(r.posts),
        orders: Number(r.orders),
        revenue: Number(r.revenue),
        newBookings: Number(r.newBookings),
        pendingAssignments: Number(r.pendingAssignments),
        activeCoupons: Number(r.activeCoupons),
        newInquiries: Number(r.newInquiries),
      };
    }

    if (recentRes.status === "fulfilled") {
      for (const r of recentRes.value.rows) {
        const s = String(r.status);
        activity.push({
          who: String(r.who),
          what: String(r.what),
          status: s,
          tone: s.startsWith("Paid")
            ? "green"
            : s === "pending" || s === "new"
              ? "gold"
              : s === "returned"
                ? "red"
                : "ink",
          when: String(r.created_at),
        });
      }
    }

    if (pendRes.status === "fulfilled") {
      for (const r of pendRes.value.rows) {
        review.push({
          title: String(r.user_name),
          sub: `${r.course_slug} · lesson ${r.lesson}`,
          href: "/assignments",
          badge: "Review",
        });
      }
    }

    if (nbRes.status === "fulfilled") {
      for (const r of nbRes.value.rows) {
        review.push({
          title: String(r.name),
          sub: `${r.subject} · ${String(r.slot) === "morning-ist" ? "Morning IST" : "Evening IST"}`,
          href: "/bookings",
          badge: "Booking",
        });
      }
    }

    if (sadhaksRes.status === "fulfilled") {
      sadhaks = Number(sadhaksRes.value.rows[0]?.cnt ?? 0);
    }
  }

  return { stats, activity, review, sadhaks };
}

export default async function AdminDashboard() {
  const admin = await getSeeker();
  const { stats, activity, review, sadhaks } = await loadData();
  const first = admin?.fullName?.split(" ")[0] ?? "Team";

  return (
    <>
      <PageHeader
        title={`Welcome back, ${first}`}
        sub="Here's what's happening at the kutir today."
      />

      {/* Quick actions */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ActionCard href="/vageshwari" label="Write a post" icon={<Newspaper size={20} />} delay={0.05} />
        <ActionCard href="/assignments" label="Review assignments" icon={<ClipboardCheck size={20} />} delay={0.1} />
        <ActionCard href="/availability" label="Block dates" icon={<CalendarDays size={20} />} delay={0.15} />
        <ActionCard href="/coupons" label="Add a coupon" icon={<TicketPercent size={20} />} delay={0.2} />
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <IconStat label="Sadhaks" value={sadhaks} icon={<Users size={20} />} tile="bg-[#E8EBFD] text-[#4356E0]" delay={0.15} />
        <IconStat label="Orders" value={stats.orders} icon={<ShoppingBag size={20} />} tile="bg-[#E8EBFD] text-[#4356E0]" delay={0.2} />
        <IconStat
          label="Revenue"
          value={`₹${stats.revenue.toLocaleString("en-IN")}`}
          icon={<IndianRupee size={20} />}
          tile="bg-emerald-50 text-emerald-600"
          delay={0.25}
        />
        <IconStat
          label="Pending review"
          value={stats.pendingAssignments + stats.newBookings + stats.newInquiries}
          icon={<NotebookPen size={20} />}
          tile="bg-rose-50 text-rose-500"
          delay={0.3}
        />
      </div>

      {/* Two columns */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card delay={0.3} className="p-0">
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="text-lg font-bold text-ink">Recent activity</h2>
            <Link href="/orders" className="text-xs font-semibold text-[#4356E0] hover:underline">
              View all
            </Link>
          </div>
          {activity.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-faint">
              Quiet so far — orders, bookings, and submissions appear here live.
            </p>
          ) : (
            <ul className="mt-2 pb-2">
              {activity.map((a, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-paper-warm/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#E8EBFD] text-xs font-bold text-[#4356E0]">
                      {a.who.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{a.who}</p>
                      <p className="truncate text-xs text-ink-faint">{a.what}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        a.tone === "green"
                          ? "bg-green-50 text-green-700"
                          : a.tone === "gold"
                            ? "bg-gold-soft/40 text-ink"
                            : a.tone === "red"
                              ? "bg-red-50 text-red-600"
                              : "bg-ink/5 text-ink-soft"
                      }`}
                    >
                      {a.status}
                    </span>
                    <p className="mt-0.5 text-[10px] text-ink-faint">{a.when}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card delay={0.35} className="p-0">
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="text-lg font-bold text-ink">Needs attention</h2>
          </div>
          {review.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-faint">
              All clear — nothing waiting.
            </p>
          ) : (
            <ul className="mt-2 pb-2">
              {review.map((r, i) => (
                <li key={i}>
                  <Link
                    href={r.href}
                    className="flex items-center justify-between gap-3 border-l-2 border-[#5B7CFA]/70 px-5 py-3 transition-colors hover:bg-[#F0F3FF]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{r.title}</p>
                      <p className="truncate text-xs text-ink-faint">{r.sub}</p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-[#E8EBFD] px-2.5 py-1 text-[11px] font-semibold text-[#4356E0]">
                      {r.badge}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

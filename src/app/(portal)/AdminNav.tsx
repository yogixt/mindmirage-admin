"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
  ShieldCheck,
  LogOut,
  Newspaper,
  Inbox,
  NotebookPen,
  ShoppingBag,
  TicketPercent,
  Users,
  Sparkles,
  Flower2,
} from "lucide-react";

const ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/vageshwari", label: "Brahmavadini", icon: Newspaper },
  { href: "/assignments", label: "Assignments", icon: ClipboardCheck },
  { href: "/availability", label: "Availability", icon: CalendarDays },
  { href: "/bookings", label: "Bookings", icon: NotebookPen },
  { href: "/events", label: "Events", icon: Flower2 },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/sadhaks", label: "Sadhaks", icon: Users },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/coupons", label: "Coupons", icon: TicketPercent },
  { href: "/assistant", label: "Kutir AI Assistant", icon: Sparkles },
  { href: "/access", label: "Access log", icon: ShieldCheck },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:pb-0">
      {ITEMS.map((it) => {
        const active = it.exact
          ? pathname === it.href
          : pathname.startsWith(it.href);
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
              active
                ? "bg-gradient-to-r from-[#5B7CFA] to-[#3F51E8] text-white shadow-[0_10px_24px_-8px_rgba(79,90,230,0.6)]"
                : "text-slate-500 hover:bg-slate-100 hover:text-ink hover:translate-x-1"
            }`}
          >
            <Icon size={16} strokeWidth={2} />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
      className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
    >
      <LogOut size={16} strokeWidth={2} />
      Logout
    </button>
  );
}

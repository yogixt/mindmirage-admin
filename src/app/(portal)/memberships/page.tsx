import type { Metadata } from "next";
import { mindMirageDb } from "@/lib/db";
import { PageHeader, Stat } from "../ui";
import MembershipsClient, { type Membership } from "./MembershipsClient";

export const metadata: Metadata = { title: "Memberships" };

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86_400_000,
  );
}

async function loadMemberships(): Promise<Membership[]> {
  const db = mindMirageDb();
  if (!db) return [];
  const rs = await db.execute(
    `SELECT id, sadhak_name, sadhak_email, course_label, starts_on, duration_label,
            duration_days, expires_on, notes, status
     FROM course_access ORDER BY id DESC LIMIT 1000`,
  );
  return rs.rows.map((r) => ({
    id: Number(r.id),
    sadhakName: String(r.sadhak_name),
    sadhakEmail: r.sadhak_email ? String(r.sadhak_email) : null,
    courseLabel: String(r.course_label),
    startsOn: String(r.starts_on),
    durationLabel: String(r.duration_label),
    durationDays: r.duration_days === null ? null : Number(r.duration_days),
    expiresOn: r.expires_on ? String(r.expires_on) : null,
    notes: r.notes ? String(r.notes) : null,
    status: (r.status === "cancelled" ? "cancelled" : "active") as "active" | "cancelled",
  }));
}

export default async function MembershipsPage() {
  const memberships = await loadMemberships();
  const today = todayStr();

  const active = memberships.filter((m) => m.status === "active");
  const lifetime = active.filter((m) => m.expiresOn === null);
  const timed = active.filter((m) => m.expiresOn !== null);
  const expired = timed.filter((m) => daysBetween(today, m.expiresOn!) < 0);
  const expiringSoon = timed.filter((m) => {
    const r = daysBetween(today, m.expiresOn!);
    return r >= 0 && r <= 7;
  });

  return (
    <>
      <PageHeader
        title="Memberships"
        deva="सदस्यता"
        sub="Time-limited course access — who has it, for how long, and what's expiring next."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active memberships" value={active.length} delay={0.05} />
        <Stat
          label="Expiring within 7 days"
          value={expiringSoon.length}
          accent={expiringSoon.length > 0 ? "text-amber-600" : "text-ink"}
          delay={0.1}
        />
        <Stat
          label="Expired, unrenewed"
          value={expired.length}
          accent={expired.length > 0 ? "text-rose-600" : "text-ink"}
          delay={0.15}
        />
        <Stat label="Lifetime access" value={lifetime.length} accent="text-[#4356E0]" delay={0.2} />
      </div>

      <MembershipsClient memberships={memberships} />
    </>
  );
}

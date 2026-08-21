import type { Metadata } from "next";
import { mindMirageDb } from "@/lib/db";
import { PageHeader } from "../ui";
import MembershipsClient, { type Membership } from "./MembershipsClient";

export const metadata: Metadata = { title: "Memberships" };

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

  return (
    <>
      <PageHeader
        title="Memberships"
        deva="सदस्यता"
        sub="Time-limited course access — who has it, for how long, and what's expiring next."
      />
      <MembershipsClient memberships={memberships} />
    </>
  );
}

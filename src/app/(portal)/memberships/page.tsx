import type { Metadata } from "next";
import { mindMirageDb } from "@/lib/db";
import { PageHeader } from "../ui";
import MembershipsClient, { type Membership, type SessionItem } from "./MembershipsClient";

export const metadata: Metadata = { title: "Memberships" };

async function loadMemberships(): Promise<Membership[]> {
  const db = mindMirageDb();
  if (!db) return [];
  const rs = await db.execute(
    `SELECT id, sadhak_name, sadhak_email, course_label, starts_on, duration_label,
            duration_days, expires_on, notes, status, tracking_type, session_items
     FROM course_access ORDER BY id DESC LIMIT 1000`,
  );
  return rs.rows.map((r) => {
    let sessionItems: SessionItem[] | null = null;
    if (r.session_items) {
      try {
        sessionItems = JSON.parse(String(r.session_items));
      } catch {
        sessionItems = null;
      }
    }
    return {
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
      trackingType: (r.tracking_type === "sessions" ? "sessions" : "duration") as "duration" | "sessions",
      sessionItems,
    };
  });
}

export default async function MembershipsPage() {
  const memberships = await loadMemberships();

  return (
    <>
      <PageHeader
        title="Memberships"
        deva="सदस्यता"
        sub="Course access — time-limited or session-based — who has it, and what's next."
      />
      <MembershipsClient memberships={memberships} />
    </>
  );
}

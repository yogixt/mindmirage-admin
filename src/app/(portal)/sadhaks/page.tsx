import type { Metadata } from "next";
import { mindMirageDb } from "@/lib/db";
import { Card, EmptyRow, PageHeader, Stat } from "../ui";
import SadhaksList from "./SadhaksList";

export const metadata: Metadata = { title: "Sadhaks" };

type SadhakRow = {
  userId: string;
  name: string;
  email: string;
  joined: string;
  city: string;
  path: string;
  why: string;
  bio: string;
  intention: string;
  avatar: string | null;
  googleImage: string | null;
  phone: string;
  enrolled: string[];
};

async function loadSadhaks(): Promise<SadhakRow[]> {
  const db = mindMirageDb();
  if (!db) return [];

  const rs = await db.execute("SELECT * FROM users ORDER BY rowid DESC LIMIT 200");
  const extras: Map<string, { bio: string; intention: string; avatar: string }> = new Map();
  try {
    const er = await db.execute(
      "SELECT user_id, bio, intention, avatar FROM sadhak_profiles",
    );
    for (const r of er.rows) {
      extras.set(String(r.user_id), {
        bio: r.bio ? String(r.bio) : "",
        intention: r.intention ? String(r.intention) : "",
        avatar: r.avatar ? String(r.avatar) : "",
      });
    }
  } catch {
    // no sadhak_profiles table — proceed
  }

  return rs.rows.map((r) => {
    const userId = String(r.id);
    const e = extras.get(userId);
    let enrolled: string[] = [];
    try {
      enrolled = JSON.parse(String(r.enrolled_programs ?? "[]"));
    } catch {
      enrolled = [];
    }
    return {
      userId,
      name: r.name ? String(r.name) : String(r.email),
      email: String(r.email),
      joined: "",
      city: r.city ? String(r.city) : "",
      path: r.preferred_path ? String(r.preferred_path) : "",
      why: r.why_i_seek ? String(r.why_i_seek) : "",
      enrolled,
      bio: e?.bio ?? "",
      intention: e?.intention ?? "",
      avatar: e?.avatar ?? null,
      googleImage: r.image ? String(r.image) : null,
      phone: r.phone ? String(r.phone) : "",
    };
  });
}

export default async function AdminSadhaksPage() {
  const sadhaks = await loadSadhaks();
  const enrolledCount = sadhaks.filter((s) => s.enrolled.length > 0).length;

  return (
    <>
      <PageHeader
        title="Sadhaks"
        deva="साधक"
        sub="Everyone who has signed in — their profiles and enrolments. Add or remove a course manually when needed."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Total sadhaks" value={sadhaks.length} delay={0.05} />
        <Stat
          label="Enrolled"
          value={enrolledCount}
          accent="text-green-700"
          delay={0.1}
        />
        <Stat
          label="Not purchased"
          value={sadhaks.length - enrolledCount}
          delay={0.15}
        />
      </div>

      {sadhaks.length === 0 ? (
        <Card delay={0.2}>
          <EmptyRow text="No sign-ups yet." />
        </Card>
      ) : (
        <SadhaksList sadhaks={sadhaks} />
      )}
    </>
  );
}

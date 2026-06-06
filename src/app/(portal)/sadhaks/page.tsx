import type { Metadata } from "next";
import { isClerkConfigured } from "@/lib/auth";
import { journalDb } from "@/lib/journal";
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
  enrolled: string[];
};

async function loadSadhaks(): Promise<SadhakRow[]> {
  if (!isClerkConfigured()) return [];
  const { createClerkClient } = await import("@clerk/backend");
  const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  const { data } = await client.users.getUserList({
    limit: 200,
    orderBy: "-created_at",
  });
  return data.map((u) => {
    const meta = u.publicMetadata as {
      enrolledPrograms?: string[];
      city?: string;
      preferredPath?: string;
      whyISeek?: string;
    };
    return {
      userId: u.id,
      name:
        [u.firstName, u.lastName].filter(Boolean).join(" ") ||
        u.emailAddresses[0]?.emailAddress ||
        "Sadhak",
      email: u.emailAddresses[0]?.emailAddress ?? "—",
      joined: new Date(u.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      city: meta.city ?? "",
      path: meta.preferredPath ?? "",
      why: meta.whyISeek ?? "",
      enrolled: (meta.enrolledPrograms ?? []).filter(Boolean),
      bio: "",
      intention: "",
      avatar: u.imageUrl ?? null,
    };
  });
}

async function loadExtras() {
  const db = journalDb();
  const map = new Map<string, { bio: string; intention: string; avatar: string }>();
  if (!db) return map;
  const rs = await db.execute(
    "SELECT user_id, bio, intention, avatar FROM sadhak_profiles",
  );
  for (const r of rs.rows) {
    map.set(String(r.user_id), {
      bio: r.bio ? String(r.bio) : "",
      intention: r.intention ? String(r.intention) : "",
      avatar: r.avatar ? String(r.avatar) : "",
    });
  }
  return map;
}

export default async function AdminSadhaksPage() {
  const sadhaks = await loadSadhaks();
  const extras = await loadExtras();
  for (const s of sadhaks) {
    const e = extras.get(s.userId);
    if (e) {
      s.bio = e.bio;
      s.intention = e.intention;
      if (e.avatar) s.avatar = e.avatar;
    }
  }
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

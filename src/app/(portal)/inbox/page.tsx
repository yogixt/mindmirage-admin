import type { Metadata } from "next";
import { journalDb } from "@/lib/journal";
import { Card, EmptyRow, PageHeader, Stat } from "../ui";
import InboxList, { type Entry } from "./InboxList";

export const metadata: Metadata = { title: "Inbox" };

async function loadEntries(): Promise<Entry[]> {
  const db = journalDb();
  if (!db) return [];
  const rs = await db.execute(
    "SELECT id, kind, name, email, whatsapp, payload, status, reply, created_at FROM form_entries ORDER BY created_at DESC LIMIT 500",
  );
  return rs.rows.map((r) => {
    let details: Record<string, string> = {};
    try {
      details = JSON.parse(String(r.payload ?? "{}"));
    } catch {
      // ignore malformed payloads
    }
    return {
      id: Number(r.id),
      kind: String(r.kind),
      name: String(r.name ?? "—"),
      email: String(r.email ?? "—"),
      whatsapp: r.whatsapp ? String(r.whatsapp) : null,
      details,
      status: String(r.status),
      createdAt: String(r.created_at),
      reply: r.reply ? String(r.reply) : null,
    };
  });
}

export default async function InboxPage() {
  const entries = await loadEntries();
  const fresh = entries.filter((e) => e.status === "new").length;

  return (
    <>
      <PageHeader
        title="Inbox"
        deva="सन्देश"
        sub="Every form on the site lands here — inquiries, mentorship, karma yoga, internships."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="New" value={fresh} accent="text-rose-500" delay={0.05} />
        <Stat
          label="Inquiries"
          value={entries.filter((e) => e.kind === "inquiry").length}
          delay={0.1}
        />
        <Stat label="All time" value={entries.length} delay={0.15} />
      </div>
      {entries.length === 0 ? (
        <Card delay={0.2}>
          <EmptyRow text="Nothing yet — new form submissions appear here instantly." />
        </Card>
      ) : (
        <Card delay={0.2}>
          <InboxList entries={entries} />
        </Card>
      )}
    </>
  );
}

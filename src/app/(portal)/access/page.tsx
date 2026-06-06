import type { Metadata } from "next";
import { journalDb } from "@/lib/journal";
import { Card, EmptyRow, PageHeader, Stat } from "../ui";

export const metadata: Metadata = { title: "Access log" };

async function loadLogins() {
  const db = journalDb();
  if (!db) return [];
  const rs = await db.execute(
    "SELECT id, email, ok, ip, user_agent, created_at FROM admin_logins ORDER BY id DESC LIMIT 200",
  );
  return rs.rows.map((r) => ({
    id: Number(r.id),
    email: String(r.email),
    success: Number(r.ok) === 1,
    ip: String(r.ip ?? ""),
    userAgent: String(r.user_agent ?? ""),
    at: String(r.created_at),
  }));
}

export default async function AccessLogPage() {
  const logins = await loadLogins();
  const failed = logins.filter((l) => !l.success).length;

  return (
    <>
      <PageHeader
        title="Access log"
        deva="प्रवेश"
        sub="Every portal login, successful or failed — permanent record, cannot be edited or deleted by anyone."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Stat label="Recorded logins" value={logins.length} delay={0.05} />
        <Stat
          label="Failed attempts"
          value={failed}
          accent={failed > 0 ? "text-rose-500" : "text-ink"}
          delay={0.1}
        />
      </div>
      <Card delay={0.15} className="p-0">
        {logins.length === 0 ? (
          <EmptyRow text="No logins recorded yet." />
        ) : (
          <ul className="divide-y divide-ink/5">
            {logins.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{l.email}</p>
                  <p className="truncate text-xs text-ink-faint">
                    {l.ip} · {l.userAgent.slice(0, 80)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      l.success
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-600"
                    }`}
                  >
                    {l.success ? "Signed in" : "Failed attempt"}
                  </span>
                  <p className="mt-0.5 text-[10px] text-ink-faint">{l.at} UTC</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

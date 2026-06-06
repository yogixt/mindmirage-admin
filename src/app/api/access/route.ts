import { NextResponse } from "next/server";
import { currentAdminEmail } from "@/lib/auth";
import { journalDb } from "@/lib/journal";

/* Read-only view of the append-only login log.
   ?after=<id> returns only newer entries (for live notifications). */

export async function GET(req: Request) {
  const me = await currentAdminEmail();
  if (!me) {
    return NextResponse.json({ ok: false, error: "team_only" }, { status: 403 });
  }
  const db = journalDb();
  if (!db) return NextResponse.json({ ok: true, me, logins: [] });

  const after = Number(new URL(req.url).searchParams.get("after") ?? 0);
  const rs = await db.execute({
    sql: `SELECT id, email, ok, ip, user_agent, created_at FROM admin_logins
          WHERE id > ? ORDER BY id DESC LIMIT 100`,
    args: [Number.isFinite(after) ? after : 0],
  });
  return NextResponse.json({
    ok: true,
    me,
    logins: rs.rows.map((r) => ({
      id: Number(r.id),
      email: String(r.email),
      success: Number(r.ok) === 1,
      ip: String(r.ip ?? ""),
      userAgent: String(r.user_agent ?? ""),
      at: String(r.created_at),
    })),
  });
}

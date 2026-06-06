import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { journalDb } from "@/lib/journal";

/* Blocked dates for the booking calendar. GET is public (the form needs
   them); changes are team-only via the admin portal. */

export async function GET() {
  const db = journalDb();
  if (!db) return NextResponse.json({ ok: true, blocked: [] });
  const rs = await db.execute(
    "SELECT date FROM blocked_dates ORDER BY date ASC",
  );
  return NextResponse.json({
    ok: true,
    blocked: rs.rows.map((r) => String(r.date)),
  });
}

const BodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  blocked: z.boolean(),
});

export async function POST(req: Request) {
  const db = journalDb();
  if (!db) {
    return NextResponse.json(
      { ok: false, error: "not_configured" },
      { status: 503 },
    );
  }
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "team_only" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  if (parsed.data.blocked) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO blocked_dates (date) VALUES (?)",
      args: [parsed.data.date],
    });
  } else {
    await db.execute({
      sql: "DELETE FROM blocked_dates WHERE date = ?",
      args: [parsed.data.date],
    });
  }

  return NextResponse.json({ ok: true, date: parsed.data.date, blocked: parsed.data.blocked });
}

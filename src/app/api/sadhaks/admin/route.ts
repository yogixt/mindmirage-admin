import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { journalDb } from "@/lib/journal";
import { CATALOG } from "@/lib/constants";

/* Manual enrolment management — add or remove a course on a sādhak's
   Turso record. Used when payments happen off-site or need correction. */

const Body = z.object({
  userId: z.string().min(1),
  slug: z.string().min(1).max(80),
  op: z.enum(["add", "remove"]),
});

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "team_only" }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  const { userId, slug, op } = parsed.data;
  if (op === "add" && !CATALOG.some((c) => c.slug === slug)) {
    return NextResponse.json({ ok: false, error: "unknown_course" }, { status: 400 });
  }

  const db = journalDb();
  if (!db) {
    return NextResponse.json({ ok: false, error: "no_database" }, { status: 500 });
  }

  const rs = await db.execute({
    sql: "SELECT enrolled_programs FROM users WHERE id = ?",
    args: [userId],
  });
  if (rs.rows.length === 0) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
  }

  let existing: string[] = [];
  try {
    existing = JSON.parse(String(rs.rows[0].enrolled_programs ?? "[]"));
  } catch {
    existing = [];
  }

  const next =
    op === "add"
      ? existing.includes(slug)
        ? existing
        : [...existing, slug]
      : existing.filter((s) => s !== slug);

  await db.execute({
    sql: "UPDATE users SET enrolled_programs = ? WHERE id = ?",
    args: [JSON.stringify(next), userId],
  });

  return NextResponse.json({ ok: true, enrolledPrograms: next });
}

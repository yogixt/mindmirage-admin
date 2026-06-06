import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { journalDb } from "@/lib/journal";

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    courseSlug: z.string().min(1).max(80),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    zoomUrl: z.string().url().max(500).optional().or(z.literal("")).default(""),
    note: z.string().max(300).optional().default(""),
  }),
  z.object({ action: z.literal("delete"), id: z.number().int().min(1) }),
]);

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "team_only" }, { status: 403 });
  }
  const db = journalDb();
  if (!db) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
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
  const d = parsed.data;
  if (d.action === "add") {
    await db.execute({
      sql: "INSERT INTO class_schedule (course_slug, on_date, at_time, zoom_url, note) VALUES (?, ?, ?, ?, ?)",
      args: [d.courseSlug, d.date, d.time, d.zoomUrl || null, d.note || null],
    });
  } else {
    await db.execute({
      sql: "DELETE FROM class_schedule WHERE id = ?",
      args: [d.id],
    });
  }
  return NextResponse.json({ ok: true });
}

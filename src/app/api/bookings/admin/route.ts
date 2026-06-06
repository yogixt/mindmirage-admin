import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { journalDb } from "@/lib/journal";

const Body = z.object({
  id: z.number().int().min(1),
  status: z.enum(["new", "handled", "approved", "declined"]),
  approvedDates: z
    .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .max(10)
    .optional(),
});

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
  await db.execute({
    sql: "UPDATE bookings SET status = ?, approved_date = ? WHERE id = ?",
    args: [
      parsed.data.status,
      parsed.data.status === "approved"
        ? (parsed.data.approvedDates ?? []).join(", ") || null
        : null,
      parsed.data.id,
    ],
  });
  return NextResponse.json({ ok: true });
}

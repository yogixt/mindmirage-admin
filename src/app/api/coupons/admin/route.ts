import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { mindMirageDb } from "@/lib/db";

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    code: z.string().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/),
    percent: z.number().int().min(1).max(100),
  }),
  z.object({ action: z.literal("toggle"), code: z.string().min(1).max(40) }),
  z.object({ action: z.literal("delete"), code: z.string().min(1).max(40) }),
]);

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "team_only" }, { status: 403 });
  }
  const db = mindMirageDb();
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
      sql: `INSERT INTO coupons (code, percent, active) VALUES (?, ?, 1)
            ON CONFLICT (code) DO UPDATE SET percent = excluded.percent, active = 1`,
      args: [d.code.toUpperCase(), d.percent],
    });
  } else if (d.action === "toggle") {
    await db.execute({
      sql: "UPDATE coupons SET active = 1 - active WHERE code = ?",
      args: [d.code.toUpperCase()],
    });
  } else {
    await db.execute({
      sql: "DELETE FROM coupons WHERE code = ?",
      args: [d.code.toUpperCase()],
    });
  }
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { mindMirageDb } from "@/lib/db";
import { sendEmail } from "@/lib/notify";

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("status"),
    id: z.number().int().min(1),
    status: z.enum(["new", "handled"]),
  }),
  z.object({
    action: z.literal("reply"),
    id: z.number().int().min(1),
    message: z.string().min(2).max(4000),
  }),
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
  if (parsed.data.action === "status") {
    await db.execute({
      sql: "UPDATE form_entries SET status = ? WHERE id = ?",
      args: [parsed.data.status, parsed.data.id],
    });
    return NextResponse.json({ ok: true });
  }

  // Reply: save it, mark handled, email if the service is configured.
  const { id, message } = parsed.data;
  const row = await db.execute({
    sql: "SELECT email FROM form_entries WHERE id = ?",
    args: [id],
  });
  const email = row.rows.length ? String(row.rows[0].email ?? "") : "";
  await db.execute({
    sql: "UPDATE form_entries SET reply = ?, replied_at = datetime('now'), status = 'handled' WHERE id = ?",
    args: [message, id],
  });
  const emailed = await sendEmail(email, "A reply from Mind Mirage", `<p>${message}</p>`);
  return NextResponse.json({ ok: true, emailed });
}

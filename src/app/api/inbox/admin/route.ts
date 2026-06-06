import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { journalDb } from "@/lib/journal";

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

/* Best-effort email via Resend — works once RESEND_API_KEY is set. */
async function sendReplyEmail(to: string, message: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.NOTIFY_EMAIL_FROM ?? "Mind Mirage <onboarding@resend.dev>",
        to: [to],
        subject: "A reply from Mind Mirage",
        html: `<div style="font-family:Georgia,serif;max-width:560px;white-space:pre-line">${message}</div><p style="color:#999;font-size:12px;margin-top:16px">Mind Mirage · Advaita Sadhana Kutir, Rishikesh · mindmirageindia.com</p>`,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

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
  const emailed = await sendReplyEmail(email, message);
  return NextResponse.json({ ok: true, emailed });
}

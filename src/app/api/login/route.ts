import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, checkCredentials, makeToken } from "@/lib/auth";
import { journalDb } from "@/lib/journal";

/* Append-only audit trail — there is intentionally no API to edit or
   delete rows from admin_logins. */
async function recordLogin(req: Request, email: string, ok: boolean) {
  try {
    const db = journalDb();
    if (!db) return;
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const ua = (req.headers.get("user-agent") ?? "").slice(0, 250);
    await db.execute({
      sql: "INSERT INTO admin_logins (email, ok, ip, user_agent) VALUES (?, ?, ?, ?)",
      args: [email.toLowerCase(), ok ? 1 : 0, ip, ua],
    });
  } catch (e) {
    console.error("[login] audit failed", e);
  }
}

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
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
  const { email, password } = parsed.data;
  if (!checkCredentials(email, password)) {
    await recordLogin(req, email, false);
    return NextResponse.json({ ok: false, error: "wrong_credentials" }, { status: 401 });
  }
  await recordLogin(req, email, true);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, makeToken(email.trim().toLowerCase()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

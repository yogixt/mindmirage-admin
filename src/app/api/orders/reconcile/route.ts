import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { SITE } from "@/lib/constants";

/* Thin authenticated proxy to mindmirage's /api/razorpay/reconcile — that's
   where the Razorpay credentials and payment-recording logic live. This
   route exists so the team can trigger a reconciliation sweep from their own
   login here, without the reconcile secret ever reaching the browser. */

const Body = z.object({
  days: z.number().int().min(1).max(180).optional().default(30),
});

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "team_only" }, { status: 403 });
  }

  const key = process.env.RECONCILE_API_KEY;
  if (!key) {
    return NextResponse.json({ ok: false, error: "reconcile_not_configured" }, { status: 503 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine — defaults apply */
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  try {
    const res = await fetch(`${SITE.url}/api/razorpay/reconcile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-reconcile-key": key,
      },
      body: JSON.stringify({ days: parsed.data.days }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error("[orders/reconcile] upstream call failed", e);
    return NextResponse.json({ ok: false, error: "upstream_unreachable" }, { status: 502 });
  }
}

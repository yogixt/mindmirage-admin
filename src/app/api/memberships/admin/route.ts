import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { mindMirageDb, runMigrations } from "@/lib/db";

/* Duration presets map to a fixed day count; "custom" and "lifetime" carry
   their own explicit value from the client instead. Kept in one place so the
   route and nothing else has to agree on what "3 months" means in days. */
const DURATION_DAYS: Record<string, number> = {
  "1_week": 7,
  "1_month": 30,
  "3_months": 90,
  "6_months": 180,
  "1_year": 365,
};

const DateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const DurationInput = z.discriminatedUnion("preset", [
  z.object({ preset: z.enum(["1_week", "1_month", "3_months", "6_months", "1_year"]) }),
  z.object({ preset: z.literal("lifetime") }),
  z.object({ preset: z.literal("custom"), days: z.number().int().min(1).max(3650) }),
]);

function durationDaysAndLabel(d: z.infer<typeof DurationInput>): { days: number | null; label: string } {
  if (d.preset === "lifetime") return { days: null, label: "Lifetime" };
  if (d.preset === "custom") return { days: d.days, label: `${d.days} day${d.days === 1 ? "" : "s"}` };
  const labels: Record<string, string> = {
    "1_week": "1 week",
    "1_month": "1 month",
    "3_months": "3 months",
    "6_months": "6 months",
    "1_year": "1 year",
  };
  return { days: DURATION_DAYS[d.preset], label: labels[d.preset] };
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    sadhakName: z.string().min(1).max(120),
    sadhakEmail: z.string().email().optional().or(z.literal("")),
    courseLabel: z.string().min(1).max(160),
    startsOn: DateStr,
    duration: DurationInput,
    notes: z.string().max(2000).optional().default(""),
  }),
  z.object({
    action: z.literal("edit"),
    id: z.number().int(),
    sadhakName: z.string().min(1).max(120),
    sadhakEmail: z.string().email().optional().or(z.literal("")),
    courseLabel: z.string().min(1).max(160),
    startsOn: DateStr,
    duration: DurationInput,
    notes: z.string().max(2000).optional().default(""),
  }),
  z.object({
    action: z.literal("renew"),
    id: z.number().int(),
    duration: DurationInput,
    // Extend from today, or stack on top of the existing expiry — the
    // client decides based on whether the membership already lapsed.
    from: DateStr,
  }),
  z.object({ action: z.literal("cancel"), id: z.number().int() }),
  z.object({ action: z.literal("reactivate"), id: z.number().int() }),
  z.object({ action: z.literal("delete"), id: z.number().int() }),
  z.object({ action: z.literal("import") }),
]);

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "team_only" }, { status: 403 });
  }
  await runMigrations();
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
    return NextResponse.json({ ok: false, error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }
  const d = parsed.data;

  if (d.action === "add") {
    const { days, label } = durationDaysAndLabel(d.duration);
    const expiresOn = days === null ? null : addDays(d.startsOn, days);
    await db.execute({
      sql: `INSERT INTO course_access
            (sadhak_name, sadhak_email, course_label, starts_on, duration_label, duration_days, expires_on, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [d.sadhakName, d.sadhakEmail || null, d.courseLabel, d.startsOn, label, days, expiresOn, d.notes || null],
    });
  } else if (d.action === "edit") {
    const { days, label } = durationDaysAndLabel(d.duration);
    const expiresOn = days === null ? null : addDays(d.startsOn, days);
    await db.execute({
      sql: `UPDATE course_access
            SET sadhak_name = ?, sadhak_email = ?, course_label = ?, starts_on = ?,
                duration_label = ?, duration_days = ?, expires_on = ?, notes = ?, updated_at = datetime('now')
            WHERE id = ?`,
      args: [d.sadhakName, d.sadhakEmail || null, d.courseLabel, d.startsOn, label, days, expiresOn, d.notes || null, d.id],
    });
  } else if (d.action === "renew") {
    const { days, label } = durationDaysAndLabel(d.duration);
    const expiresOn = days === null ? null : addDays(d.from, days);
    await db.execute({
      sql: `UPDATE course_access
            SET duration_label = ?, duration_days = ?, expires_on = ?, status = 'active', updated_at = datetime('now')
            WHERE id = ?`,
      args: [label, days, expiresOn, d.id],
    });
  } else if (d.action === "cancel") {
    await db.execute({
      sql: "UPDATE course_access SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?",
      args: [d.id],
    });
  } else if (d.action === "reactivate") {
    await db.execute({
      sql: "UPDATE course_access SET status = 'active', updated_at = datetime('now') WHERE id = ?",
      args: [d.id],
    });
  } else if (d.action === "delete") {
    await db.execute({ sql: "DELETE FROM course_access WHERE id = ?", args: [d.id] });
  } else {
    // Pull in real, verified enrollments — enrollment_grants rows that
    // already have someone with access (granted_user_id set), meaning a
    // real Razorpay payment cleared and the course was actually granted.
    // No duration was ever attached to those purchases (site enrolment is
    // permanent), so they land here as Lifetime; the team can edit any of
    // them afterward to start tracking a real expiry. source_grant_id keeps
    // this idempotent — re-running it only picks up newly granted courses.
    const rs = await db.execute(`
      SELECT eg.id AS grant_id, eg.slug, eg.title, eg.for_self, eg.payer_name, eg.payer_email,
             eg.for_name, eg.for_email, eg.granted_at, eg.created_at,
             o.created_at AS order_created_at
      FROM enrollment_grants eg
      LEFT JOIN orders o ON o.payment_id = eg.payment_id
      WHERE eg.granted_user_id IS NOT NULL
    `);
    let imported = 0;
    for (const row of rs.rows) {
      const forSelf = Number(row.for_self) === 1;
      const sadhakName = String((forSelf ? row.payer_name : row.for_name) ?? "").trim();
      let sadhakEmail = String((forSelf ? row.payer_email : row.for_email) ?? "").trim();
      if (sadhakEmail.endsWith("@no-email.mindmirage")) sadhakEmail = "";
      const startedRaw = String(row.order_created_at ?? row.granted_at ?? row.created_at ?? todayStr());
      const startsOn = startedRaw.slice(0, 10);

      const insert = await db.execute({
        sql: `INSERT OR IGNORE INTO course_access
              (sadhak_name, sadhak_email, course_label, starts_on, duration_label, duration_days, expires_on, notes, status, source_grant_id)
              VALUES (?, ?, ?, ?, 'Lifetime', NULL, NULL, ?, 'active', ?)`,
        args: [
          sadhakName || "Unknown",
          sadhakEmail || null,
          String(row.title ?? row.slug),
          startsOn,
          "Imported from a completed payment",
          row.grant_id,
        ],
      });
      if (insert.rowsAffected > 0) imported++;
    }
    return NextResponse.json({ ok: true, today: todayStr(), imported });
  }

  return NextResponse.json({ ok: true, today: todayStr() });
}

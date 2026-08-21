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

type SessionItem = { label: string; done: boolean; doneAt: string | null };

function buildSessionItems(labels: string[]): SessionItem[] {
  return labels.map((label) => ({ label, done: false, doneAt: null }));
}

/* Jyotiṣa is taught entirely 1-on-1 — access isn't a calendar expiry, it's
   consumed one class at a time. Confirmed structure: 10 classes + 1 extra
   class + a chart reading, per level. Any slug here gets a checklist
   instead of a duration on import. */
const SESSION_TEMPLATE_JYOTISHA: string[] = [
  "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
  "Class 6", "Class 7", "Class 8", "Class 9", "Class 10",
  "Extra class with chart reading",
];
const SESSION_SLUGS: Record<string, { label: string; template: string[] }> = {
  jyotisha: { label: "10 classes + 1 extra class with chart reading", template: SESSION_TEMPLATE_JYOTISHA },
  "jyotisha-l1": { label: "10 classes + 1 extra class with chart reading", template: SESSION_TEMPLATE_JYOTISHA },
  "jyotisha-l2": { label: "10 classes + 1 extra class with chart reading", template: SESSION_TEMPLATE_JYOTISHA },
  "jyotisha-l3": { label: "10 classes + 1 extra class with chart reading", template: SESSION_TEMPLATE_JYOTISHA },
};

/* What each course's own page actually promises for access, taken from
   mindmirage's catalog (src/lib/constants.ts — `recordedAccess` on COURSES,
   and the ₹800/month live cohorts in MONTHLY_LIVE). Course enrolment itself
   never expires anything server-side, but this is the duration the sadhak
   was actually sold, so imported memberships should reflect it instead of
   a blanket "Lifetime". Anything not listed here (and not in SESSION_SLUGS
   above) is a one-off session/shipment with no natural expiry — Lifetime is
   correct for those. */
const CATALOG_ACCESS_DAYS: Record<string, number> = {
  "bhagavad-gita": 365, // recordedAccess: "12 months"
  "advaita-vedanta": 365, // recordedAccess: "12 months"
  "sankhya-darshan": 365, // recordedAccess: "1 year"
  "lalita-for-women": 730, // recordedAccess: "2 years"
  "bhagavad-gita-live": 30, // Monthly · ₹800/month
  "advaita-vedanta-live": 30, // Monthly · ₹800/month
};

/* ₹800 is this ashram's flat rate for every monthly live cohort — proven by
   bhagavad-gita-live and advaita-vedanta-live, both listed at exactly
   ₹800/month. Not every monthly cohort has its own catalog slug though
   (Lalitā for Women doesn't — a ₹800 payment for it still landed under the
   base "lalita-for-women" slug, which normally means the full ₹30,000
   2-year membership). So the amount actually paid overrides the slug
   mapping: ₹800 always means one month, regardless of which slug it's
   filed under, because nothing else in the catalog costs exactly that. */
const MONTHLY_COHORT_RATE_INR = 800;

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    sadhakName: z.string().min(1).max(120),
    sadhakEmail: z.string().email().optional().or(z.literal("")),
    courseLabel: z.string().min(1).max(160),
    startsOn: DateStr,
    trackingType: z.enum(["duration", "sessions"]).optional().default("duration"),
    duration: DurationInput.optional(),
    sessionLabels: z.array(z.string().min(1).max(80)).min(1).max(60).optional(),
    notes: z.string().max(2000).optional().default(""),
  }),
  z.object({
    action: z.literal("edit"),
    id: z.number().int(),
    sadhakName: z.string().min(1).max(120),
    sadhakEmail: z.string().email().optional().or(z.literal("")),
    courseLabel: z.string().min(1).max(160),
    startsOn: DateStr,
    trackingType: z.enum(["duration", "sessions"]).optional().default("duration"),
    duration: DurationInput.optional(),
    sessionLabels: z.array(z.string().min(1).max(80)).min(1).max(60).optional(),
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
  z.object({
    action: z.literal("toggleSession"),
    id: z.number().int(),
    index: z.number().int().min(0),
    done: z.boolean(),
  }),
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

  if (d.action === "add" || d.action === "edit") {
    const isSessions = d.trackingType === "sessions";
    const labels = isSessions ? (d.sessionLabels && d.sessionLabels.length > 0 ? d.sessionLabels : SESSION_TEMPLATE_JYOTISHA) : null;
    const sessionItems = labels ? JSON.stringify(buildSessionItems(labels)) : null;
    const durationLabel = isSessions ? `0 of ${labels!.length} sessions` : durationDaysAndLabel(d.duration!).label;
    const durationDays = isSessions ? null : durationDaysAndLabel(d.duration!).days;
    const expiresOn = isSessions ? null : durationDays === null ? null : addDays(d.startsOn, durationDays);

    if (d.action === "add") {
      await db.execute({
        sql: `INSERT INTO course_access
              (sadhak_name, sadhak_email, course_label, starts_on, duration_label, duration_days, expires_on, notes, tracking_type, session_items)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          d.sadhakName, d.sadhakEmail || null, d.courseLabel, d.startsOn,
          durationLabel, durationDays, expiresOn, d.notes || null,
          isSessions ? "sessions" : "duration", sessionItems,
        ],
      });
    } else {
      // Editing an existing entry keeps its current session progress if
      // it's already session-based and staying that way — only a fresh
      // switch into "sessions" (or an explicit new label set) resets it.
      let finalSessionItems = sessionItems;
      let finalDurationLabel = durationLabel;
      if (isSessions && !d.sessionLabels) {
        const existing = await db.execute({
          sql: "SELECT tracking_type, session_items FROM course_access WHERE id = ?",
          args: [d.id],
        });
        const row = existing.rows[0];
        if (row && row.tracking_type === "sessions" && row.session_items) {
          finalSessionItems = String(row.session_items);
          const items = JSON.parse(finalSessionItems) as SessionItem[];
          finalDurationLabel = `${items.filter((i) => i.done).length} of ${items.length} sessions`;
        }
      }
      await db.execute({
        sql: `UPDATE course_access
              SET sadhak_name = ?, sadhak_email = ?, course_label = ?, starts_on = ?,
                  duration_label = ?, duration_days = ?, expires_on = ?, notes = ?,
                  tracking_type = ?, session_items = ?, updated_at = datetime('now')
              WHERE id = ?`,
        args: [
          d.sadhakName, d.sadhakEmail || null, d.courseLabel, d.startsOn,
          finalDurationLabel, durationDays, expiresOn, d.notes || null,
          isSessions ? "sessions" : "duration", finalSessionItems, d.id,
        ],
      });
    }
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
  } else if (d.action === "toggleSession") {
    const existing = await db.execute({
      sql: "SELECT session_items FROM course_access WHERE id = ? AND tracking_type = 'sessions'",
      args: [d.id],
    });
    if (!existing.rows.length) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    const items = JSON.parse(String(existing.rows[0].session_items ?? "[]")) as SessionItem[];
    if (d.index >= items.length) {
      return NextResponse.json({ ok: false, error: "bad_index" }, { status: 400 });
    }
    items[d.index] = { ...items[d.index], done: d.done, doneAt: d.done ? todayStr() : null };
    const doneCount = items.filter((i) => i.done).length;
    await db.execute({
      sql: `UPDATE course_access
            SET session_items = ?, duration_label = ?, updated_at = datetime('now')
            WHERE id = ?`,
      args: [JSON.stringify(items), `${doneCount} of ${items.length} sessions`, d.id],
    });
  } else {
    // Pull in real, verified enrollments — enrollment_grants rows that
    // already have someone with access (granted_user_id set), meaning a
    // real Razorpay payment cleared and the course was actually granted.
    // Session-based programs (SESSION_SLUGS) get a checklist; everything
    // else gets a duration from what that course actually promises
    // (CATALOG_ACCESS_DAYS, amount-paid override for ₹800 monthly cohorts),
    // or Lifetime if neither applies. source_grant_id keeps this
    // idempotent — re-running only picks up newly granted courses.
    const rs = await db.execute(`
      SELECT eg.id AS grant_id, eg.slug, eg.title, eg.for_self, eg.payer_name, eg.payer_email,
             eg.for_name, eg.for_email, eg.granted_at, eg.created_at,
             o.created_at AS order_created_at, o.amount_inr AS order_amount
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
      const slug = String(row.slug);

      const sessionProgram = SESSION_SLUGS[slug];
      if (sessionProgram) {
        const items = buildSessionItems(sessionProgram.template);
        const insert = await db.execute({
          sql: `INSERT OR IGNORE INTO course_access
                (sadhak_name, sadhak_email, course_label, starts_on, duration_label, duration_days, expires_on, notes, status, source_grant_id, tracking_type, session_items)
                VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, 'active', ?, 'sessions', ?)`,
          args: [
            sadhakName || "Unknown",
            sadhakEmail || null,
            String(row.title ?? row.slug),
            startsOn,
            `0 of ${items.length} sessions`,
            "Imported from a completed payment",
            row.grant_id,
            JSON.stringify(items),
          ],
        });
        if (insert.rowsAffected > 0) imported++;
        continue;
      }

      const orderAmount = row.order_amount === null ? null : Number(row.order_amount);
      const accessDays =
        orderAmount === MONTHLY_COHORT_RATE_INR ? 30 : (CATALOG_ACCESS_DAYS[slug] ?? null);
      const durationLabel =
        accessDays === null
          ? "Lifetime"
          : accessDays === 30
            ? "1 month"
            : accessDays === 365
              ? "1 year"
              : accessDays === 730
                ? "2 years"
                : `${accessDays} days`;
      const expiresOn = accessDays === null ? null : addDays(startsOn, accessDays);

      const insert = await db.execute({
        sql: `INSERT OR IGNORE INTO course_access
              (sadhak_name, sadhak_email, course_label, starts_on, duration_label, duration_days, expires_on, notes, status, source_grant_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
        args: [
          sadhakName || "Unknown",
          sadhakEmail || null,
          String(row.title ?? row.slug),
          startsOn,
          durationLabel,
          accessDays,
          expiresOn,
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

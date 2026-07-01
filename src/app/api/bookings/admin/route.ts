import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { mindMirageDb, runMigrations } from "@/lib/db";
import { sendEmail, sendWhatsApp } from "@/lib/notify";
import { scheduleForSubject } from "@/lib/constants";

const Body = z.object({
  id: z.number().int().min(1),
  status: z.enum(["new", "handled", "approved", "declined"]),
  approvedDates: z
    .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .max(10)
    .optional(),
  paid: z.boolean().optional(),
});

function scheduleAtTime(schedule: ReturnType<typeof scheduleForSubject>): string | null {
  if (schedule.flexible) return null;
  const m = schedule.ist.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = m[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}`;
}

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
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  /* Fetch the booking before updating so we can send a confirmation */
  const before = await db.execute({
    sql: "SELECT name, email, whatsapp, subject, slot, item_slug FROM bookings WHERE id = ?",
    args: [parsed.data.id],
  });
  const booking = before.rows[0];
  const sadhakEmail = booking ? String(booking.email ?? "") : "";
  const sadhakName = booking ? String(booking.name ?? "") : "";
  const sadhakWhatsapp = booking ? String(booking.whatsapp ?? "") : "";
  const subjectSlug = booking ? String(booking.subject ?? "") : "";
  const itemSlug = booking ? String(booking.item_slug ?? "") : "";
  const schedule = scheduleForSubject(subjectSlug);

  /* Update status + approved dates + paid flag */
  const updates = ["status = ?"];
  const vals: (string | number | null)[] = [parsed.data.status];

  const approvedDates = parsed.data.approvedDates ?? [];

  /* When approving, block the dates on the public calendar and populate the
     class schedule so Zoom links can be attached later. */
  if (parsed.data.status === "approved" && approvedDates.length > 0) {
    const courseSlug = itemSlug || subjectSlug || "general";
    const atTime = scheduleAtTime(schedule);

    for (const d of approvedDates) {
      await db.execute({
        sql: "INSERT OR IGNORE INTO blocked_dates (date, reason) VALUES (?, ?)",
        args: [d, `Confirmed: ${courseSlug}`],
      });
    }

    /* Remove stale class rows for this course on these dates, then re-insert. */
    await db.execute({
      sql: `DELETE FROM class_schedule WHERE course_slug = ? AND on_date IN (${approvedDates.map(() => "?").join(", ")})`,
      args: [courseSlug, ...approvedDates],
    });

    for (const d of approvedDates) {
      await db.execute({
        sql: `INSERT INTO class_schedule (course_slug, on_date, at_time, note)
              VALUES (?, ?, ?, ?)`,
        args: [courseSlug, d, atTime, `Booking #${parsed.data.id}`],
      });
    }
  }

  if (parsed.data.status === "approved") {
    updates.push("approved_date = ?");
    vals.push(approvedDates.join(", ") || null);
  } else {
    updates.push("approved_date = ?");
    vals.push(null);
  }

  if (parsed.data.paid !== undefined) {
    updates.push("paid = ?");
    vals.push(parsed.data.paid ? 1 : 0);
  }

  vals.push(parsed.data.id);
  await db.execute({
    sql: `UPDATE bookings SET ${updates.join(", ")} WHERE id = ?`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: vals as any,
  });

  /* Fire-and-forget confirmation email + WhatsApp on approval */
  if (parsed.data.status === "approved" && sadhakEmail) {
    const datesHtml = approvedDates
      .map((d) => {
        const nice = new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
          weekday: "short", day: "numeric", month: "short", year: "numeric",
        });
        return `<li>${nice}</li>`;
      })
      .join("");

    Promise.all([
      sendEmail(
        sadhakEmail,
        "Your class booking is confirmed 🙏",
        `<p>Namaste ${sadhakName},</p><p>Your class booking with Mind Mirage has been confirmed.</p><p><strong>Approved dates:</strong></p><ul>${datesHtml}</ul><p>You will receive the Zoom link via email 24 hours before each session.</p><p>If you have any questions, reply to this email or reach out on WhatsApp.</p><p style="margin-top:20px">— Acharya Ji & the Mind Mirage team</p>`,
      ),
      sadhakWhatsapp
        ? sendWhatsApp(
            sadhakWhatsapp,
            `Namaste ${sadhakName}, your class booking with Mind Mirage is confirmed. We will share the Zoom link 24 hours before each session. — Acharya Ji & the Mind Mirage team`,
          )
        : Promise.resolve(false),
    ]).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}

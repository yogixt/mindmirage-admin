import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { mindMirageDb } from "@/lib/db";

/* Team-only: upload assignment questions per course + lesson, and review
   submissions. Approving unlocks the sādhak's next lesson. */

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "team_only" }, { status: 403 });
  }
  const db = mindMirageDb();
  if (!db) return NextResponse.json({ ok: true, pending: [], questions: [] });

  const pending = await db.execute(
    `SELECT id, user_id, user_name, course_slug, lesson, image, submitted_at
     FROM assignment_submissions WHERE status = 'pending'
     ORDER BY submitted_at ASC`,
  );
  const questions = await db.execute(
    "SELECT course_slug, lesson, user_id, questions, file_name, video_url, (file IS NOT NULL) AS has_file FROM assignment_questions ORDER BY course_slug, lesson",
  );
  return NextResponse.json({
    ok: true,
    pending: pending.rows.map((r) => ({
      id: Number(r.id),
      userId: String(r.user_id),
      userName: String(r.user_name),
      courseSlug: String(r.course_slug),
      lesson: Number(r.lesson),
      image: String(r.image),
      submittedAt: String(r.submitted_at),
    })),
    questions: questions.rows.map((r) => ({
      courseSlug: String(r.course_slug),
      lesson: Number(r.lesson),
      questions: String(r.questions),
      targetUserId: String(r.user_id ?? ""),
      hasFile: Number(r.has_file) === 1,
      fileName: r.file_name ? String(r.file_name) : null,
      videoUrl: r.video_url ? String(r.video_url) : "",
    })),
  });
}

const BodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("questions"),
    courseSlug: z.string().min(1).max(80),
    lesson: z.number().int().min(1).max(500),
    questions: z.string().max(8000).optional().default(""),
    // "" targets all sadhaks; a Clerk user id targets one sadhak only.
    targetUserId: z.string().max(80).optional().default(""),
    videoUrl: z.string().url().max(500).optional().or(z.literal("")).default(""),
    // Optional attachment — handwritten scan, image, PDF, or doc (data URL).
    file: z.string().startsWith("data:").max(2_800_000).optional(),
    fileName: z.string().max(200).optional(),
    removeFile: z.boolean().optional().default(false),
  }),
  z.object({
    action: z.literal("deleteQuestions"),
    courseSlug: z.string().min(1).max(80),
    lesson: z.number().int().min(1).max(500),
    targetUserId: z.string().max(80).optional().default(""),
  }),
  z.object({
    action: z.literal("review"),
    id: z.number().int().min(1),
    verdict: z.enum(["approved", "returned"]),
    marks: z.number().int().min(0).max(100).nullable().optional(),
    remarks: z.string().max(2000).optional().default(""),
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
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  if (parsed.data.action === "questions") {
    const { courseSlug, lesson, questions, file, fileName, removeFile, targetUserId, videoUrl } = parsed.data;
    if (!questions.trim() && !file && removeFile) {
      return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });
    }
    if (removeFile || file) {
      // Replace (or clear) the attachment along with the text.
      await db.execute({
        sql: `INSERT INTO assignment_questions (course_slug, lesson, user_id, questions, file, file_name, video_url, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
              ON CONFLICT (course_slug, lesson, user_id)
              DO UPDATE SET questions = excluded.questions, file = excluded.file,
                            file_name = excluded.file_name, video_url = excluded.video_url, updated_at = datetime('now')`,
        args: [courseSlug, lesson, targetUserId, questions, file ?? null, file ? (fileName ?? "assignment") : null, videoUrl || null],
      });
    } else {
      // No new file picked — keep the existing attachment.
      await db.execute({
        sql: `INSERT INTO assignment_questions (course_slug, lesson, user_id, questions, video_url, updated_at)
              VALUES (?, ?, ?, ?, ?, datetime('now'))
              ON CONFLICT (course_slug, lesson, user_id)
              DO UPDATE SET questions = excluded.questions, video_url = excluded.video_url, updated_at = datetime('now')`,
        args: [courseSlug, lesson, targetUserId, questions, videoUrl || null],
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "deleteQuestions") {
    const { courseSlug, lesson, targetUserId } = parsed.data;
    await db.execute({
      sql: "DELETE FROM assignment_questions WHERE course_slug = ? AND lesson = ? AND user_id = ?",
      args: [courseSlug, lesson, targetUserId],
    });
    return NextResponse.json({ ok: true });
  }

  const { id, verdict, marks, remarks } = parsed.data;
  await db.execute({
    sql: "UPDATE assignment_submissions SET status = ?, marks = ?, remarks = ?, reviewed_at = datetime('now') WHERE id = ?",
    args: [verdict, marks ?? null, remarks?.trim() || null, id],
  });
  return NextResponse.json({ ok: true });
}

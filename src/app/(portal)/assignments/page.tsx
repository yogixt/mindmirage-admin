import type { Metadata } from "next";

import { COURSES } from "@/lib/constants";
import { journalDb } from "@/lib/journal";
import { Card, PageHeader } from "../ui";
import AssignmentsManager from "./AssignmentsManager";
import ScheduleManager, { type ClassSlot } from "./ScheduleManager";
import { CATALOG } from "@/lib/constants";

export const metadata: Metadata = { title: "Assignments" };
export const dynamic = "force-dynamic";

async function loadSadhaks() {
  const db = journalDb();
  if (!db) return [];
  try {
    const rs = await db.execute("SELECT id, name, email, image, enrolled_programs FROM users");
    return rs.rows.map((r) => {
      let enrolled: string[] = [];
      try {
        enrolled = JSON.parse(String(r.enrolled_programs ?? "[]"));
      } catch {
        enrolled = [];
      }
      return {
        userId: String(r.id),
        name: r.name ? String(r.name) : String(r.email),
        avatar: r.image ? String(r.image) : null,
        enrolled: enrolled.filter((s) => COURSES.some((c) => c.slug === s)),
      };
    });
  } catch {
    return [];
  }
}

type Progress = { approved: number; pending: number };

async function loadProgress() {
  const db = journalDb();
  const perUser = new Map<string, Progress>(); // `${userId}:${course}`
  const maxLesson = new Map<string, number>();
  const avatars = new Map<string, string>();
  if (!db) return { perUser, maxLesson, avatars };
  const subs = await db.execute(
    `SELECT user_id, course_slug,
            SUM(status = 'approved') AS approved,
            SUM(status = 'pending') AS pending
     FROM assignment_submissions GROUP BY user_id, course_slug`,
  );
  for (const r of subs.rows) {
    perUser.set(`${r.user_id}:${r.course_slug}`, {
      approved: Number(r.approved),
      pending: Number(r.pending),
    });
  }
  const lessons = await db.execute(
    "SELECT course_slug, MAX(lesson) AS maxL FROM assignment_questions GROUP BY course_slug",
  );
  for (const r of lessons.rows) {
    maxLesson.set(String(r.course_slug), Number(r.maxL));
  }
  const av = await db.execute(
    "SELECT user_id, avatar FROM sadhak_profiles WHERE avatar IS NOT NULL",
  );
  for (const r of av.rows) avatars.set(String(r.user_id), String(r.avatar));
  return { perUser, maxLesson, avatars };
}

async function loadSchedule(): Promise<ClassSlot[]> {
  const db = journalDb();
  if (!db) return [];
  const rs = await db.execute(
    "SELECT * FROM class_schedule WHERE on_date >= date('now') ORDER BY on_date ASC, at_time ASC LIMIT 50",
  );
  return rs.rows.map((r) => ({
    id: Number(r.id),
    courseSlug: String(r.course_slug),
    course:
      CATALOG.find((c) => c.slug === String(r.course_slug))?.title ??
      String(r.course_slug),
    date: String(r.on_date),
    time: String(r.at_time),
    zoomUrl: r.zoom_url ? String(r.zoom_url) : null,
    note: r.note ? String(r.note) : null,
  }));
}

export default async function AdminAssignmentsPage() {
  const courses = COURSES.map((c) => ({ slug: c.slug, title: c.title }));
  const liveCourses = CATALOG.filter(
    (c) => "formats" in c && c.formats || c.slug.startsWith("1on1-"),
  ).map((c) => ({ slug: c.slug, title: c.title }));
  const sadhaks = await loadSadhaks();
  const { perUser, maxLesson, avatars } = await loadProgress();
  const schedule = await loadSchedule();

  // One progress row per sadhak per enrolled course.
  const progress = sadhaks.flatMap((s) =>
    s.enrolled.map((slug) => {
      const p = perUser.get(`${s.userId}:${slug}`) ?? { approved: 0, pending: 0 };
      const total = Math.max(maxLesson.get(slug) ?? 0, p.approved + 1);
      const pct = Math.min(100, Math.round((p.approved / Math.max(total, 1)) * 100));
      return {
        userId: s.userId,
        name: s.name,
        avatar: avatars.get(s.userId) ?? s.avatar,
        course: courses.find((c) => c.slug === slug)?.title ?? slug,
        lesson: p.approved + 1,
        pct,
        pending: p.pending,
        complete: total > 0 && p.approved >= total,
      };
    }),
  );

  return (
    <>
      <PageHeader
        title="Assignments"
        deva="अभ्यास"
        sub="Upload lessons, review handwritten work, give marks — approval unlocks the next video."
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          {/* ── Schedule: upcoming live classes ── */}
          <Card delay={0.1}>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-lg font-bold text-ink">
                Schedule{" "}
                <span className="text-sm font-semibold text-ink-faint">
                  {schedule.length}
                </span>
              </h2>
              <span className="text-xs font-semibold text-ink-faint">
                Upcoming classes · IST
              </span>
            </div>
            <ScheduleManager
              slots={schedule}
              courses={liveCourses.length ? liveCourses : courses}
            />
          </Card>

          <AssignmentsManager courses={courses} sadhaks={sadhaks} />
        </div>

        {/* ── Right rail: sadhaks and their progress ── */}
        <Card delay={0.2} className="p-0 lg:sticky lg:top-20">
          <div className="flex items-baseline justify-between px-5 pt-5">
            <h2 className="text-lg font-bold text-ink">
              Sadhaks{" "}
              <span className="text-sm font-semibold text-ink-faint">
                {progress.length}
              </span>
            </h2>
          </div>
          {progress.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-faint">
              Enrolled sadhaks appear here with their lesson progress.
            </p>
          ) : (
            <ul className="mt-2 space-y-3 px-4 pb-4">
              {progress.map((p, i) => (
                <li
                  key={`${p.userId}:${p.course}`}
                  className="relative rounded-2xl bg-[#F6F7FC] p-4 ring-1 ring-[#E7EAF8]"
                >
                  {p.pending > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-ink text-[10px] font-bold text-white">
                      {p.pending}
                    </span>
                  )}
                  <div className="flex items-center gap-3">
                    {p.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.avatar}
                        alt=""
                        className="size-9 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#5B7CFA] to-[#3F51E8] text-xs font-bold text-white">
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {p.name}
                      </p>
                      <p className="truncate text-xs text-ink-faint">{p.course}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] font-semibold">
                    <span className="text-ink-soft">
                      {p.complete ? "Complete" : `Lesson ${p.lesson}`}
                    </span>
                    <span className="text-ink">{p.pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#E2E6F5]">
                    <div
                      className={`h-full rounded-full ${p.complete ? "bg-emerald-500" : "bg-ink"}`}
                      style={{ width: `${Math.max(p.pct, 3)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

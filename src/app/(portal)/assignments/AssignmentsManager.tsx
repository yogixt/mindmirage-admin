"use client";

import { useEffect, useState } from "react";

/* Team side of the assignment flow:
   1) write/update the questions for a course + lesson;
   2) review pending handwritten submissions — approve or return. */

type Pending = {
  id: number;
  userId: string;
  userName: string;
  courseSlug: string;
  lesson: number;
  image: string;
  submittedAt: string;
};

type QuestionRow = {
  courseSlug: string;
  lesson: number;
  questions: string;
  targetUserId: string;
  videoUrl: string;
  hasFile: boolean;
  fileName: string | null;
};

/* Images get downscaled; PDFs/docs pass through (size-checked). */
async function fileToDataUrl(f: File): Promise<string> {
  if (f.type.startsWith("image/")) {
    const url = URL.createObjectURL(f);
    try {
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const el = new Image();
        el.onload = () => res(el);
        el.onerror = rej;
        el.src = url;
      });
      const MAX = 1600;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.8);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  if (f.size > 1_900_000) throw new Error("too_big");
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}

export default function AssignmentsManager({
  courses,
  sadhaks,
}: {
  courses: { slug: string; title: string }[];
  sadhaks: { userId: string; name: string; avatar?: string | null }[];
}) {
  const avatarOf = (userId: string) =>
    sadhaks.find((s) => s.userId === userId)?.avatar ?? null;
  const [pending, setPending] = useState<Pending[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Question form state
  const [courseSlug, setCourseSlug] = useState(courses[0]?.slug ?? "");
  const [lesson, setLesson] = useState(1);
  const [targetUserId, setTargetUserId] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<{ data: string; name: string } | null>(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const refresh = () =>
    fetch("/api/assignments/admin")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setPending(d.pending);
          setQuestions(d.questions);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));

  useEffect(() => {
    void refresh();
  }, []);

  const existing = questions.find(
    (q) =>
      q.courseSlug === courseSlug &&
      q.lesson === lesson &&
      q.targetUserId === targetUserId,
  );

  // Prefill when course/lesson matches an existing row.
  useEffect(() => {
    setText(existing?.questions ?? "");
    setVideoUrl(existing?.videoUrl ?? "");
    setFile(null);
    setRemoveFile(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseSlug, lesson, targetUserId, questions]);

  const saveQuestions = async () => {
    setSaving(true);
    setSavedNote(null);
    try {
      const res = await fetch("/api/assignments/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "questions",
          courseSlug,
          lesson,
          questions: text,
          targetUserId,
          videoUrl,
          ...(file && { file: file.data, fileName: file.name }),
          removeFile,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error();
      setSavedNote("Saved.");
      void refresh();
    } catch {
      setSavedNote("Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const [grades, setGrades] = useState<Record<number, { marks: string; remarks: string }>>({});

  const review = async (id: number, verdict: "approved" | "returned") => {
    const g = grades[id] ?? { marks: "", remarks: "" };
    setPending((prev) => prev.filter((p) => p.id !== id)); // optimistic
    try {
      const res = await fetch("/api/assignments/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "review",
          id,
          verdict,
          marks: g.marks.trim() === "" ? null : Number(g.marks),
          remarks: g.remarks,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error();
    } catch {
      void refresh(); // revert
    }
  };

  const courseTitle = (slug: string) =>
    courses.find((c) => c.slug === slug)?.title ?? slug;

  return (
    <div className="space-y-6">
      {/* ── Questions ── */}
      <div className="rounded-2xl border border-ink/10 bg-paper p-4 sm:p-5">
        <h2 className="display text-xl text-ink">Lesson questions</h2>
        <p className="mt-1 text-xs text-ink-soft">
          Pick the course and lesson, write the questions. Sādhaks see them on
          their dashboard for their current lesson.
        </p>
        {/* Target: everyone, or one sadhak individually */}
        <div className="mt-3">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-faint">
            For
          </label>
          <select
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            className="w-full rounded-xl border border-ink/15 bg-transparent px-4 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
          >
            <option value="">All sadhaks (default for this lesson)</option>
            {sadhaks.map((s) => (
              <option key={s.userId} value={s.userId}>
                Only: {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[2fr_1fr]">
          <select
            value={courseSlug}
            onChange={(e) => setCourseSlug(e.target.value)}
            className="w-full rounded-xl border border-ink/15 bg-transparent px-4 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink"
          >
            {courses.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={lesson}
            onChange={(e) => setLesson(Math.max(1, Number(e.target.value)))}
            className="w-full rounded-xl border border-ink/15 bg-transparent px-4 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink"
            aria-label="Lesson number"
          />
        </div>
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="Video lesson link (unlisted YouTube / Vimeo / Drive) — unlocks automatically with this lesson"
          className="mt-3 w-full rounded-xl border border-ink/15 bg-transparent px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="Type the questions here — or just attach a file below…"
          className="mt-3 w-full rounded-xl border border-ink/15 bg-transparent px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-ink"
        />

        {/* Attachment — handwritten scan, image, PDF, or doc */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-full bg-[#E8EBFD] px-5 py-2 text-xs font-semibold text-[#4356E0] transition-colors hover:bg-[#dde2fb]">
            {file ? "Change file" : "Attach file (image / PDF / doc)"}
            <input
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const data = await fileToDataUrl(f);
                  setFile({ data, name: f.name });
                  setRemoveFile(false);
                  setSavedNote(null);
                } catch {
                  setSavedNote("File too large — keep it under 1.8 MB.");
                }
                e.target.value = "";
              }}
            />
          </label>
          {file && (
            <span className="text-xs font-semibold text-emerald-600">
              {file.name} — attached, save to publish
            </span>
          )}
          {!file && existing?.hasFile && !removeFile && (
            <span className="inline-flex items-center gap-2 text-xs text-ink-soft">
              Current: {existing.fileName ?? "attachment"}
              <button
                type="button"
                onClick={() => setRemoveFile(true)}
                className="font-semibold text-red-500 hover:underline"
              >
                Remove
              </button>
            </span>
          )}
          {removeFile && (
            <span className="text-xs text-red-500">
              Attachment will be removed on save.
            </span>
          )}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            disabled={saving || (text.trim().length < 2 && !file && !(existing?.hasFile && !removeFile))}
            onClick={() => void saveQuestions()}
            className="rounded-full bg-saffron px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-clay disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save questions"}
          </button>
          {savedNote && <span className="text-xs text-ink-soft">{savedNote}</span>}
        </div>
      </div>

      {/* ── Uploaded lessons — everything saved, at a glance ── */}
      <div className="rounded-2xl border border-ink/10 bg-paper p-4 sm:p-5">
        <h2 className="display text-xl text-ink">
          Uploaded lessons{" "}
          <span className="text-sm font-semibold text-ink-faint">
            {questions.length}
          </span>
        </h2>
        {questions.length === 0 ? (
          <p className="mt-2 text-sm text-ink-faint">
            Nothing uploaded yet — saved lessons appear here.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-ink/5">
            {questions.map((q) => {
              const target = q.targetUserId
                ? sadhaks.find((s) => s.userId === q.targetUserId)?.name ?? "One sadhak"
                : "All sadhaks";
              return (
                <li
                  key={`${q.courseSlug}:${q.lesson}:${q.targetUserId}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      {courseTitle(q.courseSlug)} · Lesson {q.lesson}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                      <span
                        className={`rounded-full px-2 py-0.5 font-semibold ${
                          q.targetUserId
                            ? "bg-amber-50 text-amber-700"
                            : "bg-[#E8EBFD] text-[#4356E0]"
                        }`}
                      >
                        {target}
                      </span>
                      {q.videoUrl && <span className="text-emerald-600">video attached</span>}
                      {q.hasFile && <span>file: {q.fileName ?? "attachment"}</span>}
                      {q.questions.trim() && (
                        <span className="truncate">
                          {q.questions.slice(0, 70)}
                          {q.questions.length > 70 ? "…" : ""}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCourseSlug(q.courseSlug);
                        setLesson(q.lesson);
                        setTargetUserId(q.targetUserId);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="rounded-full border border-ink/15 px-4 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-ink hover:text-ink"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete ${courseTitle(q.courseSlug)} lesson ${q.lesson} (${target})?`)) {
                          void (async () => {
                            await fetch("/api/assignments/admin", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                action: "deleteQuestions",
                                courseSlug: q.courseSlug,
                                lesson: q.lesson,
                                targetUserId: q.targetUserId,
                              }),
                            });
                            void refresh();
                          })();
                        }
                      }}
                      className="rounded-full bg-rose-500 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-600"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Pending submissions ── */}
      <div className="rounded-2xl border border-ink/10 bg-paper p-4 sm:p-5">
        <h2 className="display text-xl text-ink">
          Pending submissions
          {loaded && (
            <span className="ml-2 align-middle rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">
              {pending.length}
            </span>
          )}
        </h2>
        {!loaded ? (
          <p className="mt-3 text-sm text-ink-faint">Loading…</p>
        ) : pending.length === 0 ? (
          <p className="mt-3 text-sm text-ink-faint">
            Nothing waiting — all copybooks reviewed.
          </p>
        ) : (
          <ul className="mt-3 space-y-4">
            {pending.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-ink/10 bg-paper-warm/40 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2.5">
                    {avatarOf(p.userId) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarOf(p.userId)!}
                        alt=""
                        className="size-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-[#5B7CFA] to-[#3F51E8] text-xs font-bold text-white">
                        {p.userName.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <p className="text-sm font-semibold text-ink">{p.userName}</p>
                  </span>
                  <p className="text-xs text-ink-faint">
                    {courseTitle(p.courseSlug)} · Lesson {p.lesson} ·{" "}
                    {p.submittedAt}
                  </p>
                </div>
                <a href={p.image} target="_blank" rel="noreferrer noopener">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image}
                    alt={`Assignment by ${p.userName}`}
                    className="mt-3 max-h-64 rounded-lg border border-ink/10 object-contain"
                  />
                </a>
                {/* Marks + remarks for this sadhak */}
                <div className="mt-3 grid gap-2 sm:grid-cols-[7rem_1fr]">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="Marks /100"
                    value={grades[p.id]?.marks ?? ""}
                    onChange={(e) =>
                      setGrades((g) => ({
                        ...g,
                        [p.id]: { marks: e.target.value, remarks: g[p.id]?.remarks ?? "" },
                      }))
                    }
                    className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                  />
                  <input
                    placeholder="Remarks for the sadhak (optional)"
                    value={grades[p.id]?.remarks ?? ""}
                    onChange={(e) =>
                      setGrades((g) => ({
                        ...g,
                        [p.id]: { marks: g[p.id]?.marks ?? "", remarks: e.target.value },
                      }))
                    }
                    className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                  />
                </div>
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => void review(p.id, "approved")}
                    className="rounded-full bg-green-600 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-700"
                  >
                    Approve — unlock next lesson
                  </button>
                  <button
                    type="button"
                    onClick={() => void review(p.id, "returned")}
                    className="rounded-full bg-red-600 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                  >
                    Return for redo
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

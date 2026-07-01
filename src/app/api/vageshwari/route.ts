import { NextResponse } from "next/server";
import { z } from "zod";
import { canReadVageshwari, getSeeker, getSeekerUserId, isAdmin } from "@/lib/auth";
import { mindMirageDb, listPosts, POST_CATEGORIES } from "@/lib/db";

const BodySchema = z.object({
  title: z.string().min(5).max(200),
  category: z.enum(
    POST_CATEGORIES.map((c) => c.value) as [string, ...string[]],
  ),
  body: z.string().max(12000).optional().default(""),
  link: z.string().url().max(500).optional().or(z.literal("")).default(""),
  image: z.string().url().max(500).optional().or(z.literal("")).default(""),
});

export async function GET() {
  // Reading the feed requires an enrolled seeker (or the team).
  const viewerId = await getSeekerUserId();
  if (!viewerId) {
    return NextResponse.json(
      { ok: false, error: "sign_in_required" },
      { status: 401 },
    );
  }
  if (!(await canReadVageshwari())) {
    return NextResponse.json(
      { ok: false, error: "enrolled_only" },
      { status: 403 },
    );
  }
  const posts = await listPosts(viewerId);
  return NextResponse.json({ ok: true, posts });
}

export async function POST(req: Request) {
  const db = mindMirageDb();
  if (!db) {
    return NextResponse.json(
      { ok: false, error: "vageshwari_not_configured" },
      { status: 503 },
    );
  }

  // Only the team posts.
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "team_only" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const seeker = await getSeeker();
  const author = seeker?.fullName?.trim() || "Mind Mirage Team";
  await db.execute({
    sql: "INSERT INTO posts (author, category, title, body, link, image) VALUES (?, ?, ?, ?, ?, ?)",
    args: [
      author,
      parsed.data.category,
      parsed.data.title.trim(),
      parsed.data.body.trim(),
      parsed.data.link.trim(),
      parsed.data.image.trim(),
    ],
  });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { mindMirageDb } from "@/lib/db";

/* Team-only: remove a post and its likes/comments. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = mindMirageDb();
  if (!db) {
    return NextResponse.json(
      { ok: false, error: "vageshwari_not_configured" },
      { status: 503 },
    );
  }
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "team_only" }, { status: 403 });
  }

  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  await db.batch([
    { sql: "DELETE FROM post_comments WHERE post_id = ?", args: [postId] },
    { sql: "DELETE FROM post_likes WHERE post_id = ?", args: [postId] },
    { sql: "DELETE FROM posts WHERE id = ?", args: [postId] },
  ]);

  return NextResponse.json({ ok: true });
}

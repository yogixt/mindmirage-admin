import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { CATALOG } from "@/lib/constants";

/* Manual enrolment management — add or remove a course on a sādhak's
   Clerk metadata. Used when payments happen off-site or need correction. */

const Body = z.object({
  userId: z.string().min(1),
  slug: z.string().min(1).max(80),
  op: z.enum(["add", "remove"]),
});

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "team_only" }, { status: 403 });
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
  const { userId, slug, op } = parsed.data;
  if (op === "add" && !CATALOG.some((c) => c.slug === slug)) {
    return NextResponse.json({ ok: false, error: "unknown_course" }, { status: 400 });
  }

  const { createClerkClient } = await import("@clerk/backend");
  const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  const user = await client.users.getUser(userId);
  const existing = ((user.publicMetadata.enrolledPrograms as string[]) ?? []).filter(Boolean);
  const next =
    op === "add"
      ? existing.includes(slug)
        ? existing
        : [...existing, slug]
      : existing.filter((s) => s !== slug);
  await client.users.updateUser(userId, {
    publicMetadata: { ...user.publicMetadata, enrolledPrograms: next },
  });
  return NextResponse.json({ ok: true, enrolledPrograms: next });
}

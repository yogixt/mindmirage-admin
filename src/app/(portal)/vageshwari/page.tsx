import type { Metadata } from "next";
import { mindMirageDb, listPosts } from "@/lib/db";
import { Card, EmptyRow, PageHeader, Stat } from "../ui";
import DeletePostButton from "./DeletePostButton";
import NewPostForm from "./NewPostForm";

export const metadata: Metadata = { title: "Brahmavadini" };

function formatDate(iso: string) {
  return new Date(iso.endsWith("Z") ? iso : `${iso}Z`).toLocaleDateString(
    "en-IN",
    { day: "numeric", month: "short", year: "numeric" },
  );
}

async function engagement() {
  const db = mindMirageDb();
  if (!db) return { likes: 0, comments: 0 };
  const rs = await db.execute(
    "SELECT (SELECT COUNT(*) FROM post_likes) AS likes, (SELECT COUNT(*) FROM post_comments) AS comments",
  );
  return {
    likes: Number(rs.rows[0].likes),
    comments: Number(rs.rows[0].comments),
  };
}

export default async function AdminVageshwariPage() {
  const posts = await listPosts();
  const { likes, comments } = await engagement();

  return (
    <>
      <PageHeader
        title="Brahmavadini"
        deva="पत्रिका"
        sub="Everything posted here appears on the enrolled sadhaks' feed — they can read, like, and comment."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Posts" value={posts.length} delay={0.05} />
        <Stat label="Likes" value={likes} accent="text-red-600" delay={0.1} />
        <Stat label="Comments" value={comments} accent="text-green-700" delay={0.15} />
      </div>

      <Card delay={0.2} className="mb-6">
        <h2 className="mb-3 text-lg font-bold text-ink">Write a post</h2>
        <NewPostForm />
      </Card>

      <Card delay={0.25} className="p-0">
        {posts.length === 0 ? (
          <EmptyRow text="No posts yet — write the first letter to the satsang." />
        ) : (
          <ul>
            {posts.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-4 border-b border-ink/5 px-5 py-4 last:border-0 transition-colors hover:bg-paper-warm/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{p.title}</p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    <span className="rounded-full bg-saffron/10 px-2 py-0.5 font-semibold capitalize text-saffron">
                      {p.category}
                    </span>{" "}
                    · {p.author} · {formatDate(p.created_at)} · {p.likes} likes
                    · {p.comments} comments
                  </p>
                </div>
                <DeletePostButton postId={p.id} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

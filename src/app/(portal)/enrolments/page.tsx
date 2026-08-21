import type { Metadata } from "next";
import { mindMirageDb } from "@/lib/db";
import { Card, EmptyRow, PageHeader, Stat } from "../ui";

export const metadata: Metadata = { title: "Enrolments" };

type Grant = {
  id: number;
  paymentId: string;
  slug: string;
  title: string;
  payerName: string | null;
  payerEmail: string | null;
  payerUserId: string | null;
  forName: string | null;
  forEmail: string | null;
  forSelf: boolean;
  grantedUserId: string | null;
  createdAt: string;
};

async function loadGrants(): Promise<Grant[]> {
  const db = mindMirageDb();
  if (!db) return [];
  const rs = await db.execute(
    `SELECT id, payment_id, slug, title, payer_user_id, payer_name, payer_email,
            for_name, for_email, for_self, granted_user_id, created_at
     FROM enrollment_grants ORDER BY id DESC LIMIT 500`,
  );
  return rs.rows.map((r) => ({
    id: Number(r.id),
    paymentId: String(r.payment_id ?? ""),
    slug: String(r.slug ?? ""),
    title: String(r.title ?? r.slug ?? ""),
    payerUserId: r.payer_user_id ? String(r.payer_user_id) : null,
    payerName: r.payer_name ? String(r.payer_name) : null,
    payerEmail: r.payer_email ? String(r.payer_email) : null,
    forName: r.for_name ? String(r.for_name) : null,
    forEmail: r.for_email ? String(r.for_email) : null,
    forSelf: Number(r.for_self ?? 1) === 1,
    grantedUserId: r.granted_user_id ? String(r.granted_user_id) : null,
    createdAt: String(r.created_at),
  }));
}

function displayFor(g: Grant): string {
  if (g.forName || g.forEmail) return g.forName || g.forEmail || "—";
  return g.payerName || g.payerEmail || "—";
}

export default async function EnrolmentsPage() {
  const grants = await loadGrants();
  const pending = grants.filter((g) => !g.grantedUserId);
  const proxy = grants.filter((g) => !g.forSelf);
  const guestPending = pending.filter((g) => g.forSelf && !g.payerUserId);

  return (
    <>
      <PageHeader
        title="Enrolments"
        deva="प्रवेश"
        sub="Every course grant — who paid, who it's for, and whether that person has access yet."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total grants" value={grants.length} delay={0.05} />
        <Stat
          label="Paid for someone else"
          value={proxy.length}
          delay={0.1}
        />
        <Stat
          label="Pending — no account yet"
          value={pending.length}
          accent={pending.length > 0 ? "text-amber-600" : "text-ink"}
          delay={0.15}
        />
        <Stat
          label="Enrolled"
          value={grants.length - pending.length}
          accent="text-emerald-600"
          delay={0.2}
        />
      </div>

      {pending.length > 0 && (
        <Card delay={0.2} className="mb-6 overflow-x-auto p-0">
          <div className="px-5 pt-5">
            <h2 className="text-lg font-bold text-ink">Needs follow-up</h2>
            <p className="mt-0.5 text-xs text-ink-soft">
              Paid, but the person taking the course doesn&apos;t have an account with this email
              yet. They&apos;ll be enrolled automatically the moment they sign up with it — or
              reach out and help them get started.
            </p>
          </div>
          <table className="mt-3 w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink/5 text-xs uppercase tracking-wider text-ink-faint">
                <th className="px-5 py-3 font-semibold">Paid by</th>
                <th className="px-5 py-3 font-semibold">Course is for</th>
                <th className="px-5 py-3 font-semibold">Course</th>
                <th className="px-5 py-3 font-semibold">When</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((g) => (
                <tr key={g.id} className="border-b border-ink/5 last:border-0">
                  <td className="px-5 py-3.5">
                    {g.payerUserId ? (
                      <>
                        <p className="font-semibold text-ink">{g.payerName || "—"}</p>
                        <p className="text-xs text-ink-faint">{g.payerEmail}</p>
                      </>
                    ) : (
                      <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs font-semibold text-ink-soft">
                        Guest checkout
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-ink">{displayFor(g)}</p>
                    <p className="text-xs text-ink-faint">{g.forEmail}</p>
                  </td>
                  <td className="px-5 py-3.5 text-ink-soft">{g.title}</td>
                  <td className="px-5 py-3.5 text-xs text-ink-faint">{g.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card delay={0.25} className="overflow-x-auto p-0">
        <div className="px-5 pt-5">
          <h2 className="text-lg font-bold text-ink">All grants</h2>
        </div>
        {grants.length === 0 ? (
          <EmptyRow text="No course purchases yet." />
        ) : (
          <table className="mt-3 w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink/5 text-xs uppercase tracking-wider text-ink-faint">
                <th className="px-5 py-3 font-semibold">Paid by</th>
                <th className="px-5 py-3 font-semibold">Course is for</th>
                <th className="px-5 py-3 font-semibold">Course</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">When</th>
              </tr>
            </thead>
            <tbody>
              {grants.map((g) => (
                <tr
                  key={g.id}
                  className="border-b border-ink/5 last:border-0 transition-colors hover:bg-paper-warm/40"
                >
                  <td className="px-5 py-3.5">
                    {g.payerUserId ? (
                      <>
                        <p className="font-semibold text-ink">{g.payerName || "—"}</p>
                        <p className="text-xs text-ink-faint">{g.payerEmail}</p>
                      </>
                    ) : (
                      <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs font-semibold text-ink-soft">
                        Guest
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {g.forSelf ? (
                      <span className="text-ink-faint">same as payer</span>
                    ) : (
                      <>
                        <p className="font-semibold text-ink">{displayFor(g)}</p>
                        <p className="text-xs text-ink-faint">{g.forEmail}</p>
                      </>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-ink-soft">{g.title}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        g.grantedUserId
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {g.grantedUserId ? "Enrolled" : "Pending"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-ink-faint">{g.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {guestPending.length > 0 && (
        <p className="mt-4 text-xs text-ink-faint">
          {guestPending.length} of the pending grants above are guest checkouts (meditation /
          Ashtanga Hridayam) with no account at all yet — normal until they sign up.
        </p>
      )}
    </>
  );
}

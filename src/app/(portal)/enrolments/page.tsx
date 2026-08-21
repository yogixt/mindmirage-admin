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

/* Multi-level programs — mindmirage's catalog sells each level as its own
   purchase (Jyotiṣa L1–L3, Meditation L1–L3), self-paced with no gate
   between them (confirmed on the course pages: "Each level is taken and
   paid for on its own — begin at Level 1 and progress at your own pace").
   That means a sadhak's levels show up as unrelated rows in enrollment_grants
   with no link between them — this is what reconnects them so the team can
   see a person's actual progress through a program, not just a flat list of
   separate purchases. Kept in sync by hand with mindmirage's own
   src/lib/constants.ts (COURSES[].levels) since the two apps don't share code. */
const LEVEL_PROGRAMS: Record<string, { programTitle: string; levels: { slug: string; label: string }[] }> = {
  jyotisha: {
    programTitle: "Jyotiṣa · Vedic Astrology",
    levels: [
      { slug: "jyotisha-l1", label: "Level 1" },
      { slug: "jyotisha-l2", label: "Level 2" },
      { slug: "jyotisha-l3", label: "Level 3" },
    ],
  },
  meditation: {
    programTitle: "Meditation",
    levels: [
      { slug: "meditation-l1", label: "Level 1" },
      { slug: "meditation-l2", label: "Level 2" },
      { slug: "meditation-l3", label: "Level 3" },
    ],
  },
};

const SLUG_TO_LEVEL = new Map<string, { programKey: string; index: number }>();
for (const [programKey, program] of Object.entries(LEVEL_PROGRAMS)) {
  program.levels.forEach((lv, index) => SLUG_TO_LEVEL.set(lv.slug, { programKey, index }));
}

type LevelProgress = {
  key: string;
  name: string;
  email: string | null;
  programKey: string;
  owned: boolean[];
};

function buildLevelProgress(grants: Grant[]): LevelProgress[] {
  const map = new Map<string, LevelProgress>();
  for (const g of grants) {
    const lv = SLUG_TO_LEVEL.get(g.slug);
    // Only count access that's actually been granted — a pending (no
    // account yet) level purchase isn't "owned" until it resolves.
    if (!lv || !g.grantedUserId) continue;
    const program = LEVEL_PROGRAMS[lv.programKey];
    const key = `${g.grantedUserId}:${lv.programKey}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        name: displayFor(g),
        email: g.forSelf ? g.payerEmail : g.forEmail,
        programKey: lv.programKey,
        owned: Array(program.levels.length).fill(false),
      });
    }
    map.get(key)!.owned[lv.index] = true;
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export default async function EnrolmentsPage() {
  const grants = await loadGrants();
  const pending = grants.filter((g) => !g.grantedUserId);
  const proxy = grants.filter((g) => !g.forSelf);
  const guestPending = pending.filter((g) => g.forSelf && !g.payerUserId);
  const levelProgress = buildLevelProgress(grants);

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

      {levelProgress.length > 0 && (
        <Card delay={0.18} className="mb-6 overflow-x-auto p-0">
          <div className="px-5 pt-5">
            <h2 className="text-lg font-bold text-ink">Level progress</h2>
            <p className="mt-0.5 text-xs text-ink-soft">
              Jyotiṣa and Meditation are sold level by level, self-paced — this reconnects each
              sadhak&apos;s separate level purchases so you can see how far they&apos;ve gone,
              and who&apos;s a candidate for the next level.
            </p>
          </div>
          <ul className="mt-3 divide-y divide-ink/5 pb-2">
            {levelProgress.map((p) => {
              const program = LEVEL_PROGRAMS[p.programKey];
              const highestOwned = p.owned.lastIndexOf(true);
              // The level to suggest next — the first gap strictly after the
              // highest one they own, never a level below what they already
              // have (levels aren't gated, so someone could in principle own
              // L3 without L1/L2; "ready for" should never suggest going
              // backward).
              let nextIndex = -1;
              for (let i = highestOwned + 1; i < program.levels.length; i++) {
                if (!p.owned[i]) {
                  nextIndex = i;
                  break;
                }
              }
              return (
                <li key={p.key} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{p.name}</p>
                    <p className="text-xs text-ink-faint">
                      {program.programTitle}
                      {p.email && ` · ${p.email}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      {program.levels.map((lv, i) => (
                        <span
                          key={lv.slug}
                          title={p.owned[i] ? `${lv.label} — owned` : `${lv.label} — not yet`}
                          className={`grid size-7 place-items-center rounded-full text-[11px] font-bold ${
                            p.owned[i]
                              ? "bg-gradient-to-br from-[#5B7CFA] to-[#3F51E8] text-white"
                              : "bg-ink/5 text-ink-faint ring-1 ring-inset ring-ink/10"
                          }`}
                        >
                          {i + 1}
                        </span>
                      ))}
                    </div>
                    {nextIndex === -1 ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        Completed all {program.levels.length} levels
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#EEF1FE] px-2.5 py-1 text-[11px] font-semibold text-[#4356E0]">
                        Ready for {program.levels[nextIndex].label}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

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

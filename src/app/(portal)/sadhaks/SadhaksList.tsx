"use client";

import { useState } from "react";
import { Card } from "../ui";
import EnrolmentEditor from "./EnrolmentEditor";

export type SadhakRow = {
  userId: string;
  name: string;
  email: string;
  joined: string;
  city: string;
  path: string;
  why: string;
  bio: string;
  intention: string;
  avatar: string | null;
  googleImage: string | null;
  phone: string;
  enrolled: string[];
};

const TABS = [
  { id: "all", label: "All" },
  { id: "enrolled", label: "Enrolled" },
  { id: "browsing", label: "Signed up · not purchased" },
];

export default function SadhaksList({ sadhaks }: { sadhaks: SadhakRow[] }) {
  const [tab, setTab] = useState("all");
  const shown = sadhaks.filter((s) =>
    tab === "all"
      ? true
      : tab === "enrolled"
        ? s.enrolled.length > 0
        : s.enrolled.length === 0,
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const count =
            t.id === "all"
              ? sadhaks.length
              : t.id === "enrolled"
                ? sadhaks.filter((s) => s.enrolled.length > 0).length
                : sadhaks.filter((s) => s.enrolled.length === 0).length;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                tab === t.id
                  ? "bg-gradient-to-r from-[#5B7CFA] to-[#3F51E8] text-white"
                  : "bg-[#EEF0FB] text-slate-600 hover:bg-[#E2E6FA]"
              }`}
            >
              {t.label} · {count}
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-faint">
          No one in this group.
        </p>
      ) : (
        <div className="space-y-3">
          {shown.map((s, i) => (
            <Card key={s.userId} delay={Math.min(i, 8) * 0.03}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  {s.avatar || s.googleImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.avatar || s.googleImage!}
                      alt=""
                      className="size-11 shrink-0 rounded-full object-cover ring-2 ring-[#E7EAF8]"
                    />
                  ) : (
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#5B7CFA] to-[#3F51E8] text-sm font-bold text-white">
                      {s.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{s.name}</p>
                    {s.enrolled.length === 0 && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                        Not purchased
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-faint">
                    {s.email}
                    {s.phone && ` · ${s.phone}`}
                    {s.city && ` · ${s.city}`}
                    {s.path && ` · path: ${s.path}`}
                  </p>
                  {s.intention && (
                    <p className="mt-1.5 text-xs italic text-[#4356E0]">
                      Sankalpa: {s.intention}
                    </p>
                  )}
                  {s.bio && (
                    <p className="mt-1 text-xs text-ink-soft">Bio: {s.bio}</p>
                  )}
                  {s.why && (
                    <p className="mt-1 text-xs text-ink-soft">
                      Why I seek: {s.why}
                    </p>
                  )}
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <EnrolmentEditor userId={s.userId} enrolled={s.enrolled} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

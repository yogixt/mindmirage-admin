"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type Entry = {
  id: number;
  kind: string;
  name: string;
  email: string;
  whatsapp: string | null;
  details: Record<string, string>;
  status: string;
  createdAt: string;
  reply: string | null;
};

const KINDS = [
  { id: "all", label: "All" },
  { id: "inquiry", label: "Inquiries" },
  { id: "volunteer", label: "Karma Yoga" },
  { id: "internship", label: "Internships" },
];

const HIDDEN_KEYS = new Set(["name", "email", "whatsapp"]);

export default function InboxList({ entries }: { entries: Entry[] }) {
  const router = useRouter();
  const [kind, setKind] = useState("all");
  const [busy, setBusy] = useState<number | null>(null);

  const shown = entries.filter((e) => kind === "all" || e.kind === kind);

  const [replyFor, setReplyFor] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const toggle = async (e: Entry) => {
    setBusy(e.id);
    try {
      await fetch("/api/inbox/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "status",
          id: e.id,
          status: e.status === "new" ? "handled" : "new",
        }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const sendReply = async (e: Entry) => {
    setBusy(e.id);
    setNote(null);
    try {
      const res = await fetch("/api/inbox/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reply", id: e.id, message: replyText }),
      });
      const data = await res.json();
      if (data.ok) {
        setNote(
          data.emailed
            ? "Reply emailed and saved."
            : "Reply saved. Email service not connected yet — use WhatsApp or email buttons to send it now.",
        );
        setReplyFor(null);
        setReplyText("");
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setKind(k.id)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              kind === k.id
                ? "bg-gradient-to-r from-[#5B7CFA] to-[#3F51E8] text-white"
                : "bg-[#EEF0FB] text-slate-600 hover:bg-[#E2E6FA]"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-faint">
          Nothing in this category.
        </p>
      ) : (
        <ul className="divide-y divide-ink/5">
          {shown.map((e) => (
            <li key={e.id} className="py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{e.name}</p>
                    <span className="rounded-full bg-[#E8EBFD] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#4356E0]">
                      {e.kind}
                    </span>
                    {e.status === "new" && (
                      <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        New
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {e.email}
                    {e.whatsapp ? ` · ${e.whatsapp}` : ""} · {e.createdAt}
                  </p>
                  <dl className="mt-2 space-y-1">
                    {Object.entries(e.details)
                      .filter(([k, v]) => !HIDDEN_KEYS.has(k) && String(v).trim())
                      .map(([k, v]) => (
                        <div key={k} className="text-sm">
                          <dt className="inline font-semibold capitalize text-ink-soft">
                            {k}:{" "}
                          </dt>
                          <dd className="inline whitespace-pre-line text-ink-soft">
                            {String(v)}
                          </dd>
                        </div>
                      ))}
                  </dl>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                <button
                  type="button"
                  disabled={busy === e.id}
                  onClick={() => void toggle(e)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
                    e.status === "new"
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "border border-ink/15 text-ink-soft hover:border-ink"
                  }`}
                >
                  {e.status === "new" ? "Mark handled" : "Handled — reopen"}
                </button>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setReplyFor(replyFor === e.id ? null : e.id);
                      setReplyText(e.reply ?? "");
                    }}
                    className="rounded-full bg-[#E8EBFD] px-3.5 py-1.5 text-[11px] font-semibold text-[#4356E0] hover:bg-[#dde2fb]"
                  >
                    Reply
                  </button>
                  {e.whatsapp && (
                    <a
                      href={`https://wa.me/${e.whatsapp.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="rounded-full bg-emerald-50 px-3.5 py-1.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                    >
                      WhatsApp
                    </a>
                  )}
                  <a
                    href={`mailto:${e.email}?subject=${encodeURIComponent("Re: your message to Mind Mirage")}`}
                    className="rounded-full bg-[#F6F7FC] px-3.5 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-[#E7EAF8] hover:bg-white"
                  >
                    Email
                  </a>
                </div>
                </div>
              </div>

              {e.reply && replyFor !== e.id && (
                <p className="mt-2 rounded-xl bg-[#F0F3FF] px-4 py-2.5 text-xs text-ink-soft ring-1 ring-[#E0E5FB]">
                  <span className="font-semibold text-[#4356E0]">Our reply: </span>
                  {e.reply}
                </p>
              )}

              {replyFor === e.id && (
                <div className="mt-3">
                  <textarea
                    value={replyText}
                    onChange={(ev) => setReplyText(ev.target.value)}
                    rows={3}
                    placeholder={`Reply to ${e.name}…`}
                    className="w-full rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                  />
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      disabled={busy === e.id || replyText.trim().length < 2}
                      onClick={() => void sendReply(e)}
                      className="rounded-full bg-gradient-to-r from-[#5B7CFA] to-[#3F51E8] px-5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      Send reply
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyFor(null)}
                      className="text-xs font-semibold text-ink-faint hover:text-ink"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {note && replyFor === null && (
                <p className="mt-2 text-xs font-semibold text-emerald-600">{note}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

/* Polls the access log every 30s. If someone ELSE signs in while you're
   working, a toast slides in with who and when. */

type Login = { id: number; email: string; success: boolean; at: string };

export default function LoginWatcher() {
  const [toasts, setToasts] = useState<Login[]>([]);
  const lastSeen = useRef<number>(0);
  const me = useRef<string>("");

  useEffect(() => {
    let alive = true;

    const poll = async (first: boolean) => {
      try {
        const res = await fetch(`/api/access?after=${first ? 0 : lastSeen.current}`);
        const data = await res.json();
        if (!data.ok || !alive) return;
        me.current = data.me;
        const logins: Login[] = data.logins;
        if (logins.length > 0) {
          const maxId = Math.max(...logins.map((l) => l.id));
          if (!first) {
            const fresh = logins.filter(
              (l) => l.id > lastSeen.current && l.email !== me.current,
            );
            if (fresh.length > 0) {
              setToasts((t) => [...fresh.slice(0, 3), ...t].slice(0, 3));
              setTimeout(
                () => alive && setToasts((t) => t.slice(0, Math.max(0, t.length - fresh.length))),
                10000,
              );
            }
          }
          lastSeen.current = Math.max(lastSeen.current, maxId);
        }
      } catch {
        // network hiccup — try again next tick
      }
    };

    void poll(true);
    const t = setInterval(() => void poll(false), 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
      {toasts.map((l) => (
        <div
          key={l.id}
          className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_18px_50px_-18px_rgba(80,90,200,0.5)] ring-1 ring-[#E0E5FB]"
        >
          <span
            className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${
              l.success
                ? "bg-gradient-to-br from-[#5B7CFA] to-[#3F51E8]"
                : "bg-rose-500"
            }`}
          >
            {l.email.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">
              {l.success ? "Team login" : "Failed login attempt"}
            </p>
            <p className="text-xs text-ink-soft">{l.email} · just now</p>
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputCls =
    "w-full rounded-xl border border-ink/10 bg-transparent px-4 py-3 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-indigo-400/60";

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(fd.get("email") ?? ""),
          password: String(fd.get("password") ?? ""),
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error();
      router.push("/");
      router.refresh();
    } catch {
      setError("Wrong email or password.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input
        name="email"
        type="email"
        required
        placeholder="Team email"
        autoComplete="username"
        className={inputCls}
      />
      <input
        name="password"
        type="password"
        required
        placeholder="Password"
        autoComplete="current-password"
        className={inputCls}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="mt-1 w-full rounded-xl bg-gradient-to-r from-[#5B7CFA] to-[#3F51E8] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Entering…" : "Enter the portal"}
      </button>
    </form>
  );
}

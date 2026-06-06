"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeletePostButton({ postId }: { postId: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/newsletters/${postId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) router.refresh();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <span className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="rounded-lg bg-maroon px-4 py-2 text-xs text-paper disabled:opacity-60"
        >
          {busy ? "Removing…" : "Confirm"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-lg border border-ink/15 px-4 py-2 text-xs text-ink"
        >
          Keep
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="shrink-0 rounded-lg border border-ink/15 px-4 py-2 text-xs text-ink-soft transition-colors hover:border-maroon hover:text-maroon"
    >
      Delete
    </button>
  );
}

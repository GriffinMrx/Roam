"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/*
 * Moderation queue row actions (admins). Every request is re-checked server-side
 * (Clerk role); this only drives the buttons. Destructive actions need a second click.
 */

async function call(path: string, method: string, body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Failed");
}

export function ModerationActions({ id, hidden, reportCount }: { id: string; hidden: boolean; reportCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(timer);
  }, [armed]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const button =
    "inline-flex h-8 items-center rounded-full px-3 text-small font-medium transition-colors disabled:opacity-50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => run(() => call(`/api/comments/${id}/hide`, "POST", { hidden: !hidden }))}
        className={cn(button, "bg-white/6 text-[#d4d4d8] ring-1 ring-white/10 ring-inset hover:bg-white/10")}
      >
        {hidden ? "Unhide" : "Hide"}
      </button>
      {reportCount > 0 && (
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => call(`/api/comments/${id}/reports/dismiss`, "POST"))}
          className={cn(button, "bg-white/6 text-[#d4d4d8] ring-1 ring-white/10 ring-inset hover:bg-white/10")}
        >
          Dismiss reports
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => (armed ? run(() => call(`/api/comments/${id}?permanent=1`, "DELETE")) : setArmed(true))}
        className={cn(
          button,
          armed ? "bg-red-500/80 text-white hover:bg-red-500" : "text-red-300 ring-1 ring-red-400/30 ring-inset hover:bg-red-500/15",
        )}
      >
        {armed ? "Confirm delete" : "Delete permanently"}
      </button>
      {error && <span className="text-small text-red-300">{error}</span>}
    </div>
  );
}

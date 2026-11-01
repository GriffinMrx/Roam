"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CARD_BUTTON, CARD_BUTTON_DANGER, CARD_BUTTON_GHOST, CARD_BUTTON_PRIMARY, FIELD_ERROR, TEXTAREA } from "@/components/settings/styles";
import type { CourseStatus } from "@/lib/teach/schema";

/*
 * Admin review buttons for one teacher course. POST /api/admin/courses/[id] re-checks the
 * admin role server-side; this only drives the UI.
 */
export function ReviewActions({ id, status }: { id: string; status: CourseStatus }) {
  const router = useRouter();
  const [mode, setMode] = useState<null | "reject" | "unpublish">(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (action: "approve" | "reject" | "unpublish") => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/courses/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, note: note.trim() }),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Failed");
      setMode(null);
      setNote("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (mode) {
    return (
      <div className="max-w-xl">
        <label htmlFor={`note-${id}`} className="text-[13px] font-medium text-foreground">
          {mode === "reject" ? "What should the teacher change?" : "Reason for unpublishing (shown to the teacher)"}
        </label>
        <textarea
          id={`note-${id}`}
          rows={3}
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={TEXTAREA}
        />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={busy || (mode === "reject" && !note.trim())}
            onClick={() => send(mode)}
            className={CARD_BUTTON_DANGER}
          >
            {busy ? "Sending…" : mode === "reject" ? "Send back" : "Unpublish"}
          </button>
          <button type="button" onClick={() => setMode(null)} className={CARD_BUTTON_GHOST}>
            Cancel
          </button>
        </div>
        {error && <p className={FIELD_ERROR}>{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(status === "pending" || status === "rejected") && (
          <button type="button" disabled={busy} onClick={() => send("approve")} className={CARD_BUTTON_PRIMARY}>
            {busy ? "Approving…" : "Approve & publish"}
          </button>
        )}
        {status === "pending" && (
          <button type="button" disabled={busy} onClick={() => setMode("reject")} className={CARD_BUTTON}>
            Request changes
          </button>
        )}
        {status === "published" && (
          <button type="button" disabled={busy} onClick={() => setMode("unpublish")} className={CARD_BUTTON}>
            Unpublish
          </button>
        )}
      </div>
      {error && <p className={FIELD_ERROR}>{error}</p>}
    </div>
  );
}

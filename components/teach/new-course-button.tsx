"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CARD_BUTTON, CARD_BUTTON_GHOST, FIELD_ERROR, INPUT_BARE } from "@/components/settings/styles";

/** "New course": asks for a title, creates the draft (POST /api/teach/courses), opens the editor. */
export function NewCourseButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/teach/courses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      const body = (await res.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!res.ok || !body?.id) throw new Error(body?.error ?? "Couldn't create the course.");
      router.push(`/settings/courses/${body.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={CARD_BUTTON}>
        + New course
      </button>
    );
  }
  return (
    <form onSubmit={create} className="max-w-md">
      <label htmlFor="new-course-title" className="sr-only">
        Course title
      </label>
      <div className="flex items-center gap-2">
        <input
          id="new-course-title"
          autoFocus
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Course title, e.g. Handstands from zero"
          className={INPUT_BARE}
        />
        <button type="submit" disabled={busy || !title.trim()} className={CARD_BUTTON}>
          {busy ? "Creating…" : "Create"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={CARD_BUTTON_GHOST}>
          Cancel
        </button>
      </div>
      {error && <p className={FIELD_ERROR}>{error}</p>}
    </form>
  );
}

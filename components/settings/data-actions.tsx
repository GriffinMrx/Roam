"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CARD_BUTTON, CARD_BUTTON_DANGER } from "@/components/settings/styles";

/*
 * Destructive data actions with a two-step confirm: the first click arms the button
 * ("Confirm …"), which disarms after 5 seconds. Requests go to POST /api/settings/data,
 * which only ever touches the signed-in learner's own documents.
 */

type Payload = { action: "reset-progress"; courseId: string } | { action: "clear-bookmarks" };

export function ConfirmAction({
  label,
  confirmLabel,
  doneLabel,
  payload,
}: {
  label: string;
  confirmLabel: string;
  doneLabel: string;
  payload: Payload;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "armed" | "working" | "done" | "error">("idle");

  useEffect(() => {
    if (state !== "armed") return;
    const timer = setTimeout(() => setState("idle"), 5000);
    return () => clearTimeout(timer);
  }, [state]);

  const run = async () => {
    if (state === "idle" || state === "error") return setState("armed");
    if (state !== "armed") return;
    setState("working");
    try {
      const res = await fetch("/api/settings/data", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState("done");
      router.refresh();
    } catch {
      setState("error");
    }
  };

  const armed = state === "armed";
  return (
    <button
      type="button"
      onClick={run}
      disabled={state === "working" || state === "done"}
      aria-live="polite"
      className={armed ? CARD_BUTTON_DANGER : CARD_BUTTON}
    >
      {state === "working"
        ? "Working…"
        : state === "done"
          ? doneLabel
          : armed
            ? confirmLabel
            : state === "error"
              ? "Failed. Try again"
              : label}
    </button>
  );
}

export function DownloadDataButton() {
  return (
    <a href="/api/settings/data" download="roam-data.json" className={CARD_BUTTON}>
      Download my data
    </a>
  );
}

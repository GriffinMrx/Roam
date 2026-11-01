"use client";

import { useState, type ReactNode } from "react";
import { buttonStyles, Icon } from "@/components/ui";
import { cn } from "@/lib/cn";
import { PLAYBACK_RATES, type Preferences } from "@/lib/preferences-shared";

/*
 * Learning preferences. Saved through POST /api/settings (Clerk private metadata); the
 * lesson player reads them server-side, so changes apply from the next lesson you open.
 */

function Row({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
      <div className="max-w-md">
        <p className="text-body-lg text-foreground">{title}</p>
        <p className="mt-1 text-body text-muted">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
        checked
          ? "bg-linear-to-b from-[#e4e4e7] to-[#a1a1aa] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
          : "bg-white/8 ring-1 ring-white/10 ring-inset",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block size-5 rounded-full shadow-md transition-transform duration-200",
          checked ? "translate-x-6 bg-neutral-950" : "translate-x-1 bg-[#d4d4d8]",
        )}
      />
    </button>
  );
}

export function PreferencesForm({ initial }: { initial: Preferences }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const update = (changes: Partial<Preferences>) => {
    setDraft((d) => ({ ...d, ...changes }));
    setStatus("idle");
  };

  const save = async () => {
    setStatus("saving");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { preferences: Preferences };
      setSaved(body.preferences);
      setDraft(body.preferences);
      setStatus("saved");
    } catch {
      setDraft(saved); // roll back to what is stored
      setStatus("error");
    }
  };

  return (
    <div>
      <div className="divide-y divide-white/6">
        <Row title="Default playback speed" description="Lesson videos start at this speed. You can still change it in the player.">
          <div role="radiogroup" aria-label="Default playback speed" className="flex flex-wrap gap-2">
            {PLAYBACK_RATES.map((rate) => {
              const active = draft.playbackRate === rate;
              return (
                <button
                  key={rate}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => update({ playbackRate: rate })}
                  className={cn(
                    "inline-flex h-9 items-center rounded-full px-4 text-body font-medium tabular-nums transition-colors",
                    active
                      ? "bg-linear-to-b from-[#e4e4e7] to-[#a1a1aa] text-neutral-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_12px_rgba(0,0,0,0.35)]"
                      : "bg-white/6 text-[#d4d4d8] ring-1 ring-white/10 ring-inset hover:bg-white/10",
                  )}
                >
                  {rate}×
                </button>
              );
            })}
          </div>
        </Row>
        <Row title="Captions on by default" description="Turn on captions when a lesson video starts, where the video has them.">
          <Switch checked={draft.captions} onChange={(captions) => update({ captions })} label="Captions on by default" />
        </Row>
        <Row
          title="Resume where I left off"
          description="Pick up a lesson at your last position. Turn off to always start lessons from the beginning."
        >
          <Switch checked={draft.resume} onChange={(resume) => update({ resume })} label="Resume where I left off" />
        </Row>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-white/6 pt-6">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || status === "saving"}
          className={buttonStyles({ variant: "glossy", size: "md", className: "disabled:opacity-50" })}
        >
          {status === "saving" ? "Saving…" : "Save changes"}
        </button>
        <p aria-live="polite" className="text-body">
          {status === "saved" && (
            <span className="inline-flex items-center gap-2 text-[#d4d4d8]">
              <Icon name="check-circle" size={18} />
              Saved. Applies from the next lesson you open.
            </span>
          )}
          {status === "error" && <span className="text-muted">Couldn&rsquo;t save. Please try again.</span>}
        </p>
      </div>
    </div>
  );
}

"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const TABS = [
  { key: "content", label: "Lesson Content" },
  { key: "notes", label: "Notes" },
] as const;

/**
 * "Lesson Content" / "Notes" tabs. The content panel is rendered on the server and
 * passed in; Notes is presentational (no backend), per AGENTS §7.
 */
export function LessonTabs({ children }: { children: ReactNode }) {
  const baseId = useId();
  const [active, setActive] = useState<(typeof TABS)[number]["key"]>("content");

  return (
    <div>
      <div role="tablist" aria-label="Lesson sections" className="flex gap-2 border-b border-border">
        {TABS.map((tab) => {
          const selected = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`${baseId}-${tab.key}-tab`}
              aria-selected={selected}
              aria-controls={`${baseId}-${tab.key}-panel`}
              onClick={() => setActive(tab.key)}
              className={cn(
                "-mb-px border-b-2 px-4 pb-3 text-body-lg transition-colors",
                selected
                  ? "border-primary-500 text-primary-500"
                  : "border-transparent text-muted hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-content-panel`}
        aria-labelledby={`${baseId}-content-tab`}
        hidden={active !== "content"}
      >
        {children}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-notes-panel`}
        aria-labelledby={`${baseId}-notes-tab`}
        hidden={active !== "notes"}
        className="px-4 py-10"
      >
        <p className="text-body-lg text-foreground">No notes yet</p>
        <p className="mt-1 text-body text-muted">Your notes for this lesson will appear here.</p>
      </div>
    </div>
  );
}

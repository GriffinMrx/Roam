"use client";

import { useId, useState, type ReactNode } from "react";
import { Discussion } from "@/components/comments/discussion";
import { cn } from "@/lib/cn";

const TABS = [
  { key: "content", label: "Lesson Content" },
  { key: "notes", label: "Notes" },
  { key: "discussion", label: "Discussion" },
] as const;

/**
 * "Lesson Content" / "Notes" / "Discussion" tabs. Content and Notes are rendered on the
 * server and passed in (Notes shows the lesson's notes from Sanity, read-only). Discussion
 * loads the lesson's comments from /api/comments (Neon Postgres); its count shows in the tab.
 */
export function LessonTabs({
  children,
  notes,
  lessonId,
  durationSeconds,
}: {
  children: ReactNode;
  notes: ReactNode;
  lessonId: string;
  /** Timestamp chips beyond the video's length stay plain text. */
  durationSeconds?: number;
}) {
  const baseId = useId();
  const [active, setActive] = useState<(typeof TABS)[number]["key"]>("content");
  const [count, setCount] = useState<number | null>(null);

  return (
    <div>
      <div role="tablist" aria-label="Lesson sections" className="flex gap-2 overflow-x-auto border-b border-border">
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
                "-mb-px shrink-0 border-b-2 px-4 pb-3 text-body-lg whitespace-nowrap transition-colors",
                selected
                  ? "border-primary-500 text-primary-500"
                  : "border-transparent text-muted hover:text-foreground",
              )}
            >
              {tab.label}
              {tab.key === "discussion" && count !== null && count > 0 && (
                <span className="ml-2 rounded-full bg-white/8 px-2 py-0.5 text-small text-[#d4d4d8] tabular-nums">
                  {count}
                </span>
              )}
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
      >
        {notes}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-discussion-panel`}
        aria-labelledby={`${baseId}-discussion-tab`}
        hidden={active !== "discussion"}
      >
        <Discussion lessonId={lessonId} maxSeconds={durationSeconds} onCount={setCount} />
      </div>
    </div>
  );
}

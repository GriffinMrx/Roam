"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useCourseProgress } from "@/components/course-progress";
import { Icon } from "@/components/ui";
import { cn } from "@/lib/cn";

export type CourseModuleItem = {
  key: string;
  title: string;
  summary?: string;
  /** Pre-formatted, e.g. "1h 12m". */
  duration: string;
  lessons: { id: string; title: string; href: string; duration: string; freePreview: boolean }[];
};

/** Rows shown before "Show all N modules". */
const VISIBLE = 6;

/**
 * "Course Content" list: numbered module rows that expand to their lessons. Inside a
 * CourseProgressProvider, finished lessons and modules show a check.
 */
export function CourseModules({ modules }: { modules: CourseModuleItem[] }) {
  const baseId = useId();
  const progress = useCourseProgress();
  const lessonDone = progress?.doneLessons ?? new Set<string>();
  const moduleDone = progress?.doneModules ?? new Set<string>();
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [showAll, setShowAll] = useState(false);
  const hidden = modules.length - VISIBLE;
  const visible = showAll || hidden <= 0 ? modules : modules.slice(0, VISIBLE);

  function toggle(key: string) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="relative">
      <ol className="overflow-hidden rounded-lg border border-border bg-surface">
        {visible.map((module, i) => {
          const expanded = open.has(module.key);
          const panelId = `${baseId}-${module.key}`;
          return (
            <li key={module.key} className="border-b border-border last:border-b-0">
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => toggle(module.key)}
                className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-neutral-50 sm:gap-6 sm:px-6"
              >
                {moduleDone.has(module.key) ? (
                  <span className="flex size-10 shrink-0 items-center justify-center text-primary-500">
                    <Icon name="check-circle" size={40} label={`Module ${i + 1} complete`} />
                  </span>
                ) : (
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-body-lg text-foreground">
                    {i + 1}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-body-lg text-foreground">{module.title}</span>
                  {module.summary && (
                    <span className="mt-0.5 block text-body text-subtle">{module.summary}</span>
                  )}
                  <span className="mt-1 block text-body text-muted sm:hidden">{module.duration}</span>
                </span>
                <span className="hidden shrink-0 text-body text-muted sm:block">{module.duration}</span>
                <Icon
                  name="chevron-down"
                  size={20}
                  className={cn("shrink-0 text-muted transition-transform", expanded && "rotate-180")}
                />
              </button>
              <ul id={panelId} hidden={!expanded} className="pb-3">
                {module.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <Link
                      href={lesson.href}
                      className="group/lesson flex items-center gap-4 py-2.5 pr-4 pl-[2.625rem] text-body transition-colors hover:bg-neutral-50 sm:pr-6 sm:pl-[3.625rem]"
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-3">
                        <Icon
                          name={lessonDone.has(lesson.id) ? "check-circle" : "play-circle"}
                          size={18}
                          label={lessonDone.has(lesson.id) ? "Completed" : undefined}
                          className={cn(
                            "shrink-0 transition-colors group-hover/lesson:text-primary-500",
                            lessonDone.has(lesson.id) ? "text-primary-500" : "text-muted",
                          )}
                        />
                        <span className="min-w-0 text-muted">{lesson.title}</span>
                      </span>
                      {lesson.freePreview && (
                        <span className="hidden text-small text-primary-500 sm:inline">Free preview</span>
                      )}
                      <span className="shrink-0 text-subtle tabular-nums">{lesson.duration}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
      {hidden > 0 && !showAll && (
        <div className="-mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="relative inline-flex h-11 items-center gap-3 rounded-md border border-border bg-surface px-6 text-body-lg text-foreground shadow-sm transition-colors hover:bg-neutral-50"
          >
            Show all {modules.length} modules
            <Icon name="chevron-down" size={20} className="text-muted" />
          </button>
        </div>
      )}
    </div>
  );
}

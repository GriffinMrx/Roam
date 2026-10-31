"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import { useCourseProgress } from "@/components/course-progress";
import { Icon, MaybeIcon, ProgressBar } from "@/components/ui";
import { cn } from "@/lib/cn";

export type SidebarLesson = { id: string; title: string; href: string; duration: string; current: boolean };
export type SidebarModule = { key: string; title: string; duration: string; lessons: SidebarLesson[] };

/**
 * Lesson page sidebar: course card, "Module N of M", and the module list with the
 * current module open on its lesson. On small screens it collapses into a disclosure.
 * Completion checks and the course % come from CourseProgressProvider and update live.
 */
export function LessonSidebar({
  courseTitle,
  courseHref,
  coverUrl,
  modules,
  currentModule,
}: {
  courseTitle: string;
  courseHref: string;
  coverUrl?: string;
  modules: SidebarModule[];
  /** Index of the module holding the current lesson. */
  currentModule: number;
}) {
  const baseId = useId();
  const progress = useCourseProgress();
  const percent = progress?.percent ?? 0;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [listOpen, setListOpen] = useState(true);
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(modules[currentModule] ? [modules[currentModule].key] : []),
  );

  const toggle = (key: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <aside className="border-border lg:sticky lg:top-24 lg:h-[calc(100dvh-6rem)] lg:w-75 lg:shrink-0 lg:overflow-y-auto lg:border-r">
      {/* Mobile disclosure */}
      <button
        type="button"
        aria-expanded={mobileOpen}
        aria-controls={`${baseId}-panel`}
        onClick={() => setMobileOpen((v) => !v)}
        className="flex w-full items-center justify-between border-b border-border px-6 py-4 text-body-lg text-foreground lg:hidden"
      >
        Course content
        <Icon name="chevron-down" size={20} className={cn("text-muted transition-transform", mobileOpen && "rotate-180")} />
      </button>

      <div id={`${baseId}-panel`} className={cn(mobileOpen ? "block" : "hidden", "lg:block")}>
        <div className="px-6 pt-8 pb-6">
          <Link
            href={courseHref}
            className="inline-flex items-center gap-2 text-body text-primary-500 transition-colors hover:text-primary-400"
          >
            <Icon name="arrow-right" size={18} className="rotate-180" />
            Back to course
          </Link>

          <div className="mt-8 flex items-center gap-4">
            <span className="relative size-14 shrink-0 overflow-hidden rounded-md bg-black">
              {coverUrl && <Image src={coverUrl} alt="" fill sizes="56px" className="object-cover" />}
            </span>
            <div className="min-w-0">
              <p className="text-body text-foreground">{courseTitle}</p>
              <p className="mt-1 text-small text-subtle">
                {progress?.status === "signed-out" ? "Sign in to save progress" : `${percent}% complete`}
              </p>
              <ProgressBar value={percent} showLabel={false} label="Course progress" className="mt-2 w-20 [&>div]:h-1" />
            </div>
          </div>
        </div>

        <button
          type="button"
          aria-expanded={listOpen}
          aria-controls={`${baseId}-modules`}
          onClick={() => setListOpen((v) => !v)}
          className="flex w-full items-center justify-between border-y border-border px-6 py-4 text-body text-foreground transition-colors hover:bg-neutral-50"
        >
          Module {currentModule + 1} of {modules.length}
          <Icon name="chevron-down" size={20} className={cn("text-muted transition-transform", listOpen && "rotate-180")} />
        </button>

        <ol id={`${baseId}-modules`} hidden={!listOpen}>
          {modules.map((module, i) => {
            const isCurrent = i === currentModule;
            const moduleDone = Boolean(progress?.doneModules.has(module.key));
            const expanded = open.has(module.key);
            const panelId = `${baseId}-m-${module.key}`;
            return (
              <li key={module.key} className={cn("border-b border-border", isCurrent && "bg-primary-100/40")}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => toggle(module.key)}
                  className="flex w-full items-start gap-4 px-6 py-4 text-left transition-colors hover:bg-neutral-50"
                >
                  {moduleDone ? (
                    <span className="flex size-8 shrink-0 items-center justify-center text-primary-500">
                      <Icon name="check-circle" size={32} label={`Module ${i + 1} complete`} />
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full border text-body",
                        isCurrent
                          ? "border-primary-500 bg-primary-500 text-white"
                          : "border-border text-foreground",
                      )}
                    >
                      {i + 1}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 pt-0.5">
                    <span className={cn("block text-body", isCurrent ? "text-primary-400" : "text-foreground")}>
                      {module.title}
                    </span>
                    <span className="mt-1 block text-small text-subtle">{module.duration}</span>
                  </span>
                  <Icon
                    name="chevron-down"
                    size={18}
                    className={cn("mt-1 shrink-0 text-muted transition-transform", expanded && "rotate-180")}
                  />
                </button>

                <ul id={panelId} hidden={!expanded} className="pb-3">
                  {module.lessons.map((lesson, j) => {
                    const lessonDone = Boolean(progress?.doneLessons.has(lesson.id));
                    return (
                    <li key={lesson.id} className="relative">
                      {/* Timeline: dotted connector between lessons */}
                      {j < module.lessons.length - 1 && (
                        <span
                          aria-hidden
                          className="absolute top-6 bottom-0 left-[2.15rem] border-l border-dashed border-neutral-300"
                        />
                      )}
                      <Link
                        href={lesson.href}
                        aria-current={lesson.current ? "page" : undefined}
                        className="relative flex items-start gap-4 py-2.5 pr-6 pl-[1.9rem] transition-colors hover:bg-neutral-50"
                      >
                        {lessonDone && !lesson.current ? (
                          <Icon
                            name="check-circle"
                            size={18}
                            label="Completed"
                            className="relative -ml-[5px] mt-px shrink-0 rounded-full bg-background text-primary-500"
                          />
                        ) : (
                          <span
                            aria-hidden
                            className={cn(
                              "mt-1.5 size-2 shrink-0 rounded-full border",
                              lesson.current
                                ? "border-primary-500 bg-primary-500"
                                : "border-neutral-500 bg-background",
                            )}
                          />
                        )}
                        <span className={cn("min-w-0 flex-1", lessonDone && !lesson.current ? "ml-1.5" : "ml-3.5")}>
                          <span className={cn("block text-body", lesson.current ? "text-foreground" : "text-muted")}>
                            {lesson.title}
                          </span>
                          <span
                            className={cn(
                              "mt-1 block text-small",
                              lesson.current ? "text-primary-400" : "text-subtle",
                            )}
                          >
                            {lesson.current ? (lessonDone ? "Now playing · Completed" : "Now playing") : lesson.duration}
                          </span>
                        </span>
                        {lesson.current && (
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white">
                            <MaybeIcon name="play" size={14} />
                          </span>
                        )}
                      </Link>
                    </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { useCourseProgress } from "@/components/course-progress";
import { buttonStyles, Icon, ProgressBar } from "@/components/ui";

const LABEL = { start: "Start Learning", continue: "Continue Learning", review: "Review Course" } as const;

/**
 * Start Learning (no progress) → first lesson; Continue Learning → the lesson and second
 * the learner left off at; Review Course (all done) → first lesson.
 */
export function LearnButton({
  slugs,
  className,
}: {
  /** lesson id → slug */
  slugs: Record<string, string>;
  className?: string;
}) {
  const ctx = useCourseProgress();
  const target = ctx?.target;
  const slug = target?.lessonId ? slugs[target.lessonId] : undefined;
  const href = slug ? `/lessons/${slug}${target && target.position > 0 ? `?t=${target.position}` : ""}` : "#course-content";
  return (
    <Link
      href={href}
      className={buttonStyles({ variant: "glossy", className })}
    >
      {LABEL[target?.state ?? "start"]}
      <Icon name="arrow-right" size={20} />
    </Link>
  );
}

export type StripLesson = { label: string; title: string; slug: string };

/**
 * Progress strip under the course hero: % complete, the silver bar, and the next lesson
 * ("Next up: Lesson 3.2 · Title"). Not started: "Start with Lesson 1.1". Hidden while loading.
 */
export function ProgressStrip({ lessons }: { lessons: Record<string, StripLesson> }) {
  const ctx = useCourseProgress();
  if (!ctx || ctx.status !== "ready") return null;

  const { target, percent } = ctx;
  const next = target.lessonId ? lessons[target.lessonId] : undefined;
  const started = target.state !== "start";
  const href = next ? `/lessons/${next.slug}${target.position > 0 ? `?t=${target.position}` : ""}` : "#course-content";

  return (
    <section
      aria-label="Your progress"
      className="mt-8 rounded-lg border border-ink/10 bg-linear-to-b from-ink/6 to-ink/2 p-5 shadow-(--shadow-panel) sm:p-6"
    >
      {started && (
        <div className="mb-4 flex items-center gap-4">
          <p className="shrink-0 text-body text-muted">
            Your Progress <span className="ml-1 text-foreground tabular-nums">{percent}% complete</span>
          </p>
          <ProgressBar value={percent} showLabel={false} className="flex-1" />
        </div>
      )}
      {next && (
        <Link href={href} className="group flex items-center gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-neutral-950 shadow-lg transition-transform group-hover:scale-105">
            <svg aria-hidden viewBox="0 0 24 24" className="ml-0.5 size-4" fill="currentColor">
              <path d="M7 4.6c0-1.2 1.3-1.9 2.3-1.3l11 7.4c.9.6.9 2 0 2.6l-11 7.4c-1 .7-2.3-.1-2.3-1.3V4.6Z" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-small font-semibold tracking-widest text-subtle uppercase">
              {target.state === "start" ? "Start with" : target.state === "review" ? "Review from" : "Next up"}
            </span>
            <span className="mt-0.5 block truncate text-body-lg text-foreground transition-colors group-hover:text-primary-400">
              {next.label} · {next.title}
            </span>
          </span>
          <Icon name="arrow-right" size={20} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </section>
  );
}

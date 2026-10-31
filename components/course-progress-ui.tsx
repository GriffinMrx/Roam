"use client";

import { SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { useCourseProgress } from "@/components/course-progress";
import { buttonStyles, Icon, ProgressBar } from "@/components/ui";
import { cn } from "@/lib/cn";

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
    <Link href={href} className={buttonStyles({ className: cn("px-6 shadow-md", className) })}>
      {LABEL[target?.state ?? "start"]}
      <Icon name="arrow-right" size={20} />
    </Link>
  );
}

/** "Your Progress" panel: the learner's real % (or a sign-in prompt) and the learn button. */
export function ProgressSummary({ slugs }: { slugs: Record<string, string> }) {
  const ctx = useCourseProgress();
  const signedOut = ctx?.status === "signed-out";
  const percent = ctx?.status === "ready" ? ctx.percent : 0;

  return (
    <section
      aria-label="Your progress"
      className="mt-8 flex flex-col gap-5 rounded-lg border border-border bg-surface px-6 py-5 shadow-md sm:flex-row sm:items-center sm:gap-10"
    >
      <div className="shrink-0">
        <p className="text-small text-subtle">Your Progress</p>
        <p className="mt-1 text-body-lg text-foreground">
          {signedOut ? (
            <SignInButton>
              <button type="button" className="text-primary-500 transition-colors hover:text-primary-400">
                Sign in to track your progress
              </button>
            </SignInButton>
          ) : (
            `${percent}% complete`
          )}
        </p>
      </div>
      <ProgressBar value={percent} showLabel={false} className="max-w-xs flex-1" />
      <LearnButton slugs={slugs} className="sm:ml-auto" />
    </section>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { MaybeIcon } from "./icon";

export type BadgeVariant = "video" | "lesson" | "popular" | "free" | "premium";

const variants: Record<BadgeVariant, string> = {
  video: "bg-primary-100 text-primary-500",
  lesson: "bg-neutral-100 text-neutral-700",
  popular: "bg-primary-100 text-primary-600 ring-1 ring-inset ring-primary-200",
  free: "bg-ink/6 text-soft ring-1 ring-inset ring-ink/15",
  premium: "gap-1 bg-primary-100 text-primary-400 ring-1 ring-inset ring-primary-200",
};

export function Badge({
  variant = "video",
  className,
  children,
}: {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-xs px-2 text-small font-semibold tracking-wider uppercase",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Shown next to a teacher's name: course page, instructor page (prompts/teachers-phase-1.md). */
export function TeacherBadge({ className }: { className?: string }) {
  return (
    <Badge variant="popular" className={className}>
      Teacher
    </Badge>
  );
}

/**
 * Lesson access label. Premium is a label only for now (no payments): any signed-in
 * learner can watch every lesson; free-preview lessons also play signed out.
 */
export function AccessBadge({ free, className }: { free: boolean; className?: string }) {
  return free ? (
    <Badge variant="free" className={className}>
      Free preview
    </Badge>
  ) : (
    <Badge variant="premium" className={className}>
      <MaybeIcon name="crown" size={14} />
      Premium
    </Badge>
  );
}

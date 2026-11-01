import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { MaybeIcon } from "./icon";

export type BadgeVariant = "video" | "lesson" | "popular" | "free" | "premium";

const variants: Record<BadgeVariant, string> = {
  video: "bg-primary-100 text-primary-500",
  lesson: "bg-neutral-100 text-neutral-700",
  popular: "bg-primary-100 text-primary-600 ring-1 ring-inset ring-primary-200",
  free: "bg-white/6 text-[#d4d4d8] ring-1 ring-inset ring-white/15",
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

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant = "video" | "lesson" | "popular";

const variants: Record<BadgeVariant, string> = {
  video: "bg-primary-100 text-primary-500",
  lesson: "bg-neutral-100 text-neutral-700",
  popular: "bg-primary-100 text-primary-600 ring-1 ring-inset ring-primary-200",
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

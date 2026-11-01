import { cn } from "@/lib/cn";
import type { CourseStatus } from "@/lib/teach/schema";

/* Course review status, as the teacher and admins see it (prompts/teachers-phase-1.md). */

const STATUS: Record<CourseStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-ink/6 text-soft ring-ink/15" },
  pending: { label: "In review", className: "bg-primary-100 text-primary-400 ring-primary-200" },
  published: { label: "Published", className: "bg-success/15 text-success ring-success/30" },
  rejected: { label: "Changes needed", className: "bg-red-500/15 text-red-300 ring-red-400/30 light:text-red-700" },
};

export function CourseStatusBadge({ status, className }: { status: CourseStatus; className?: string }) {
  const s = STATUS[status] ?? STATUS.draft;
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-small font-semibold ring-1 ring-inset",
        s.className,
        className,
      )}
    >
      {s.label}
    </span>
  );
}

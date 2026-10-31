import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export type StatusKind = "in-progress" | "completed" | "now-playing" | "locked";

const labels: Record<StatusKind, string> = {
  "in-progress": "In Progress",
  completed: "Completed",
  "now-playing": "Now Playing",
  locked: "Locked",
};

function StatusIcon({ status }: { status: StatusKind }) {
  switch (status) {
    case "in-progress":
      return (
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" className="text-primary-100" />
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="42.4 56.5"
            transform="rotate(-90 12 12)"
            className="text-primary-500"
          />
        </svg>
      );
    case "completed":
      return <Icon name="check-circle" size={18} className="text-success" />;
    case "now-playing":
      return <Icon name="play-circle" size={18} className="text-primary-500" />;
    case "locked":
      return <Icon name="lock" size={18} className="text-muted" />;
  }
}

export function Status({
  status,
  className,
  children,
}: {
  status: StatusKind;
  className?: string;
  /** Overrides the default label. */
  children?: ReactNode;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-body text-muted", className)}>
      <StatusIcon status={status} />
      {children ?? labels[status]}
    </span>
  );
}

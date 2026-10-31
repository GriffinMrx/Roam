import { cn } from "@/lib/cn";

export function ProgressBar({
  value,
  showLabel = true,
  label = "Course progress",
  className,
}: {
  /** Percentage, 0–100. */
  value: number;
  showLabel?: boolean;
  /** Accessible name. */
  label?: string;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100"
      >
        <div
          className="h-full rounded-full bg-primary-500 transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="shrink-0 text-body text-subtle tabular-nums">
          {pct}% complete
        </span>
      )}
    </div>
  );
}

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
        className="h-2 flex-1 rounded-full bg-neutral-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] light:shadow-[inset_0_1px_2px_rgba(15,23,42,0.12)]"
      >
        {/* Silver gradient with a soft white glow; a light sweeps across it (motion-safe) */}
        {pct > 0 && (
          <div
            className="relative h-full overflow-hidden rounded-full bg-linear-to-r from-[#71717a] via-[#d4d4d8] to-white shadow-[0_0_12px_rgba(255,255,255,0.45)] light:from-[#94a3b8] light:via-[#475569] light:to-[#0f172a] light:shadow-none transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 hidden w-1/4 bg-linear-to-r from-transparent via-white/80 to-transparent motion-safe:block motion-safe:animate-shimmer"
            />
          </div>
        )}
      </div>
      {showLabel && (
        <span className="shrink-0 text-body text-subtle tabular-nums">
          {pct}% complete
        </span>
      )}
    </div>
  );
}

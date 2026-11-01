import { cn } from "@/lib/cn";

/*
 * A tall segmented bar: one whole split into a few parts, read at a glance
 * (prompts/admin-charts-and-hardening.md). Each part is its own block with a 2px surface gap,
 * its count printed on it when it fits, and a legend of names and counts below, so the split
 * never relies on color alone. Parts with no value are left out of the bar but kept in the legend.
 */

export type Segment = { key: string; label: string; value: number; color: string; ink?: "dark" | "light" };

export function SegmentedBar({ segments, label }: { segments: Segment[]; label: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <figure>
      {total === 0 ? (
        <div className="h-10 rounded-[4px] bg-neutral-200" aria-label={`${label}: nothing yet`} role="img" />
      ) : (
        <div role="img" aria-label={`${label}: ${segments.map((s) => `${s.label} ${s.value}`).join(", ")}`} className="flex h-10 gap-[2px]">
          {segments
            .filter((s) => s.value > 0)
            .map((s, i, shown) => {
              const pct = (s.value / total) * 100;
              return (
                <div
                  key={s.key}
                  title={`${s.label}: ${s.value} (${Math.round(pct)}%)`}
                  className={cn(
                    "flex min-w-1 items-center justify-center text-small font-medium tabular-nums",
                    i === 0 && "rounded-l-[4px]",
                    i === shown.length - 1 && "rounded-r-[4px]",
                    s.ink === "dark" ? "text-[#0b0b0b]" : "text-white",
                  )}
                  style={{ width: `${pct}%`, background: s.color }}
                >
                  {pct >= 8 ? s.value : null}
                </div>
              );
            })}
        </div>
      )}
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-small">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5 text-muted">
            <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: s.color }} />
            {s.label} <span className="text-subtle tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

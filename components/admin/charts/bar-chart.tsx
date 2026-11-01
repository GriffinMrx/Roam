import { cn } from "@/lib/cn";

/*
 * Horizontal bars for survey answers (prompts/admin-charts-and-hardening.md). One hue; the
 * caller decides the order (ranked for categories, scale order for levels). Each bar is
 * anchored at the left with a 4px rounded data end, carries its count and share as text, and
 * shows a tooltip on hover or keyboard focus.
 */

export type BarRow = { key: string; label: string; count: number };

export function BarChart({ rows, total, unit = "people" }: { rows: BarRow[]; total: number; unit?: string }) {
  if (rows.length === 0) return <p className="mt-3 text-body text-muted">No answers yet.</p>;
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="mt-4 space-y-2.5">
      {rows.map((row) => {
        const pct = total ? Math.round((row.count / total) * 100) : 0;
        return (
          <li
            key={row.key}
            tabIndex={0}
            className="group relative rounded-xs outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <div className="flex items-baseline justify-between gap-3 text-body">
              <span className="truncate text-soft">{row.label}</span>
              <span className="shrink-0 text-subtle tabular-nums">
                {row.count} · {pct}%
              </span>
            </div>
            <div className="mt-1 h-2.5">
              <div
                className={cn(
                  "h-full rounded-r-[4px] bg-primary-500 transition-opacity light:bg-primary-600",
                  "group-hover:opacity-80 group-focus-visible:opacity-80",
                  row.count === 0 && "hidden",
                )}
                style={{ width: `${(row.count / max) * 100}%` }}
              />
            </div>
            <div
              role="tooltip"
              className="pointer-events-none absolute -top-9 left-0 z-10 hidden rounded-sm border border-ink/10 bg-surface px-2.5 py-1 text-small whitespace-nowrap text-foreground shadow-(--shadow-popover) group-hover:block group-focus-visible:block"
            >
              {row.label}: {row.count} {unit} ({pct}% of {total})
            </div>
          </li>
        );
      })}
    </ul>
  );
}

"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

/*
 * One daily series as columns, a line, or an area (prompts/admin-charts-and-hardening.md).
 * No chart library: columns are divs and the line is an SVG stretched to the plot, with a
 * non-scaling 2px stroke. One y-axis, a recessive grid, and a hover layer: a crosshair and
 * tooltip that also follows the arrow keys. A visually hidden table carries every value.
 */

export type TimePoint = { day: string; value: number };

/** Series color: primary-500 on dark, primary-600 on light (validated for contrast on white). */
const SERIES_TEXT = "text-primary-500 light:text-primary-600";
const SERIES_BG = "bg-primary-500 light:bg-primary-600";

const formatDay = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** A round axis maximum (1, 2, 2.5 or 5 × 10ⁿ per tick) so the gridlines land on whole numbers. */
function niceMax(max: number, ticks = 4) {
  if (max <= ticks) return ticks;
  const raw = max / ticks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw && Number.isInteger(s)) ?? 10 * pow;
  return step * ticks;
}

export function TimeChart({
  points,
  kind,
  unit,
  label,
  period = "day",
  className,
}: {
  points: TimePoint[];
  kind: "column" | "line" | "area";
  /** Plural noun for the tooltip and table, e.g. "sign-ups". */
  unit: string;
  /** Accessible name of the chart. */
  label: string;
  /** Each point is a day, or the week starting on that day. */
  period?: "day" | "week";
  className?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const tableId = useId();
  const n = points.length;
  const max = niceMax(Math.max(0, ...points.map((p) => p.value)));
  const ticks = [max, max / 2, 0];
  const xOf = (i: number) => (kind === "column" ? (i + 0.5) / n : n > 1 ? i / (n - 1) : 0.5);
  const yOf = (v: number) => 1 - v / max;
  const indexAt = (fraction: number) =>
    Math.max(0, Math.min(n - 1, kind === "column" ? Math.floor(fraction * n) : Math.round(fraction * (n - 1))));

  const path = points.map((p, i) => `${i ? "L" : "M"}${(n > 1 ? i / (n - 1) : 0.5) * 1000},${yOf(p.value) * 1000}`).join(" ");
  const shown = active === null ? null : points[active];
  const labelEvery = Math.max(1, Math.ceil(n / 6));

  return (
    <figure className={cn("w-full", className)}>
      <div className="flex gap-2">
        {/* y-axis */}
        <div aria-hidden className="relative h-44 w-8 shrink-0 text-right text-[11px] text-subtle tabular-nums">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${yOf(t) * 100}%` }}>
              {t}
            </span>
          ))}
        </div>

        {/* plot */}
        <div
          role="img"
          aria-label={`${label}. Use the arrow keys to read each day.`}
          aria-describedby={tableId}
          tabIndex={0}
          className="relative h-44 flex-1 rounded-xs outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setActive(indexAt((e.clientX - r.left) / r.width));
          }}
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
              e.preventDefault();
              const step = e.key === "ArrowRight" ? 1 : -1;
              setActive((a) => Math.max(0, Math.min(n - 1, (a ?? (step > 0 ? -1 : n)) + step)));
            }
            if (e.key === "Escape") setActive(null);
          }}
        >
          {/* gridlines; the baseline is a step stronger */}
          {ticks.map((t) => (
            <div
              key={t}
              aria-hidden
              className={cn("absolute inset-x-0 border-t", t === 0 ? "border-ink/15" : "border-ink/6")}
              style={{ top: `${yOf(t) * 100}%` }}
            />
          ))}

          {kind === "column" ? (
            <div aria-hidden className="absolute inset-0 flex items-end gap-[2px]">
              {points.map((p, i) => (
                <div key={p.day} className="flex h-full min-w-0 flex-1 items-end">
                  {p.value > 0 && (
                    <div
                      className={cn("mx-auto w-full max-w-10 rounded-t-[4px] transition-opacity", SERIES_BG, active !== null && active !== i && "opacity-60")}
                      style={{ height: `${(p.value / max) * 100}%` }}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <svg aria-hidden viewBox="0 0 1000 1000" preserveAspectRatio="none" className={cn("absolute inset-0 size-full overflow-visible", SERIES_TEXT)}>
              {kind === "area" && <path d={`${path} L1000,1000 L0,1000 Z`} fill="currentColor" fillOpacity={0.14} />}
              <path d={path} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
          )}

          {/* hover layer */}
          {shown && active !== null && (
            <>
              <div aria-hidden className="pointer-events-none absolute inset-y-0 border-l border-ink/25" style={{ left: `${xOf(active) * 100}%` }} />
              {kind !== "column" && (
                <div
                  aria-hidden
                  className={cn("pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-neutral-50", SERIES_BG)}
                  style={{ left: `${xOf(active) * 100}%`, top: `${yOf(shown.value) * 100}%` }}
                />
              )}
              <div
                aria-hidden
                className="pointer-events-none absolute top-0 z-10 rounded-sm border border-ink/10 bg-surface px-2.5 py-1.5 text-small whitespace-nowrap shadow-(--shadow-popover)"
                style={{
                  left: `${xOf(active) * 100}%`,
                  transform: `translateX(${xOf(active) > 0.7 ? "calc(-100% - 8px)" : "8px"})`,
                }}
              >
                <span className="block text-subtle">
                  {period === "week" ? "Week of " : ""}
                  {formatDay(shown.day)}
                </span>
                <span className="block font-medium text-foreground tabular-nums">
                  {shown.value} {unit}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* x-axis: a handful of dates, never one per day */}
      <div aria-hidden className="relative mt-1.5 ml-10 h-4 text-[11px] text-subtle">
        {points.map((p, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <span
              key={p.day}
              className="absolute -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${xOf(i) * 100}%`, display: i !== n - 1 && n - 1 - i < labelEvery / 2 ? "none" : undefined }}
            >
              {formatDay(p.day)}
            </span>
          ) : null,
        )}
      </div>

      <table id={tableId} className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">{period === "week" ? "Week of" : "Day"}</th>
            <th scope="col">{unit}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.day}>
              <td>{formatDay(p.day)}</td>
              <td>{p.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

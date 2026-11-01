import Link from "next/link";
import { cn } from "@/lib/cn";

/*
 * A KPI tile (prompts/admin-charts-and-hardening.md): the value, the change against the
 * previous period of the same length, and a sparkline when a daily series exists. The change
 * is written out ("+12% vs previous 30 days"), so it never relies on color alone.
 */

function Sparkline({ values }: { values: number[] }) {
  const n = values.length;
  if (n < 2) return null;
  const max = Math.max(1, ...values);
  const d = values.map((v, i) => `${i ? "L" : "M"}${(i / (n - 1)) * 100},${30 - (v / max) * 28}`).join(" ");
  return (
    <svg aria-hidden viewBox="0 0 100 32" preserveAspectRatio="none" className="mt-2 h-8 w-full text-primary-500 light:text-primary-600">
      <path d={`${d} L100,32 L0,32 Z`} fill="currentColor" fillOpacity={0.12} />
      <path d={d} fill="none" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

function Change({ total, previous, days }: { total: number; previous: number; days: number }) {
  if (previous === 0 && total === 0) return <p className="mt-0.5 text-[12px] text-subtle">No change vs previous {days} days</p>;
  if (previous === 0) return <p className="mt-0.5 text-[12px] text-subtle">New vs previous {days} days</p>;
  const pct = Math.round(((total - previous) / previous) * 100);
  const arrow = pct > 0 ? "▲" : pct < 0 ? "▼" : "";
  return (
    <p className="mt-0.5 text-[12px] text-subtle">
      <span className={cn("font-medium", pct > 0 ? "text-soft" : "text-subtle")}>
        {arrow} {pct > 0 ? "+" : ""}
        {pct}%
      </span>{" "}
      vs previous {days} days
    </p>
  );
}

export function StatTile({
  label,
  value,
  href,
  hint,
  change,
  spark,
}: {
  label: string;
  value: number | string;
  href?: string;
  hint?: string;
  change?: { total: number; previous: number; days: number };
  spark?: number[];
}) {
  const body = (
    <>
      <p className="text-small text-muted">{label}</p>
      <p className="mt-1 text-heading-1 text-foreground tabular-nums">{value}</p>
      {change && <Change {...change} />}
      {hint && <p className="mt-0.5 text-[12px] text-subtle">{hint}</p>}
      {spark && <Sparkline values={spark} />}
    </>
  );
  return (
    <li className="min-w-40 flex-1 rounded-sm bg-neutral-50 p-3">
      {href ? (
        <Link href={href} className="block transition-opacity hover:opacity-80">
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
}

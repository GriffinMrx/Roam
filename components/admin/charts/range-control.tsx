import Link from "next/link";
import { cn } from "@/lib/cn";
import { RANGES, type RangeDays } from "@/lib/admin-series";

/** 7d / 30d / 90d for the Overview charts; plain links, so it works before any JavaScript loads. */
export function RangeControl({ active }: { active: RangeDays }) {
  return (
    <nav aria-label="Date range" className="inline-flex rounded-sm bg-neutral-100 p-0.5">
      {RANGES.map((days) => (
        <Link
          key={days}
          href={days === 30 ? "/admin" : `/admin?range=${days}`}
          aria-current={days === active ? "page" : undefined}
          scroll={false}
          className={cn(
            "rounded-[5px] px-3 py-1 text-small font-medium transition-colors",
            days === active ? "bg-neutral-50 text-foreground shadow-xs" : "text-muted hover:text-foreground",
          )}
        >
          {days}d
        </Link>
      ))}
    </nav>
  );
}

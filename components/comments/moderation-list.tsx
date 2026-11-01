import Link from "next/link";
import { ModerationActions } from "@/components/comments/moderation-actions";
import { cn } from "@/lib/cn";
import type { ModerationFilter, moderationQueue } from "@/lib/comments";

/*
 * The moderation queue: filter pills and comment rows with their actions. Shared by the
 * admin page (every lesson) and the teacher's Comments tab (their own lessons only).
 */

export const MODERATION_FILTERS: { key: ModerationFilter; label: string }[] = [
  { key: "reported", label: "Reported" },
  { key: "hidden", label: "Hidden" },
  { key: "recent", label: "All recent" },
];

export function parseModerationFilter(value: unknown): ModerationFilter {
  return MODERATION_FILTERS.some((f) => f.key === value) ? (value as ModerationFilter) : "reported";
}

export function ModerationList({
  rows,
  filter,
  filterHref,
}: {
  rows: Awaited<ReturnType<typeof moderationQueue>>;
  filter: ModerationFilter;
  /** URL for a filter pill. */
  filterHref: (filter: ModerationFilter) => string;
}) {
  return (
    <>
      <nav aria-label="Filter" className="flex flex-wrap gap-2">
        {MODERATION_FILTERS.map((f) => (
          <Link
            key={f.key}
            href={filterHref(f.key)}
            aria-current={f.key === filter ? "page" : undefined}
            className={cn(
              "inline-flex h-8 items-center rounded-full px-3 text-small font-medium transition-colors",
              f.key === filter ? "bg-neutral-200 text-foreground" : "text-muted hover:text-foreground",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="mt-5 rounded-sm bg-neutral-50 px-6 py-12 text-center text-body text-muted">
          Nothing to review here.
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {rows.map((row) => (
            <li
              key={row.id}
              className={cn(
                "rounded-sm bg-neutral-50 p-5",
                row.hidden && "opacity-70",
              )}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-subtle">
                <span className="font-semibold text-foreground">{row.authorName}</span>
                <span>· {row.isReply ? "Reply" : "Comment"} on</span>
                {row.lessonSlug ? (
                  <Link href={`/lessons/${row.lessonSlug}`} className="text-soft underline-offset-2 hover:underline">
                    {row.lessonTitle}
                  </Link>
                ) : (
                  <span>{row.lessonTitle}</span>
                )}
                <span>· {new Date(row.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
                {row.hidden && <span className="font-semibold text-red-300 light:text-red-600">· Hidden</span>}
                {row.deleted && <span>· Deleted by author</span>}
              </div>
              <p className="mt-2 text-body leading-6 break-words whitespace-pre-wrap text-soft">
                {row.deleted ? <em className="text-subtle">Comment deleted</em> : row.body}
              </p>
              {row.reports.length > 0 && (
                <div className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-small text-red-100/90 light:text-red-800">
                  <p className="font-semibold">
                    {row.reportCount} {row.reportCount === 1 ? "report" : "reports"}
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {row.reports.map((r, i) => (
                      <li key={i}>{r.reason}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-4">
                <ModerationActions id={row.id} hidden={row.hidden} reportCount={row.reportCount} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

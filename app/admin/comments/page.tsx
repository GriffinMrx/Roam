import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { ModerationActions } from "@/components/comments/moderation-actions";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { cn } from "@/lib/cn";
import { getRole, moderationQueue, type ModerationFilter } from "@/lib/comments";

export const metadata: Metadata = { title: "Moderation · Roam", robots: { index: false } };

const FILTERS: { key: ModerationFilter; label: string }[] = [
  { key: "reported", label: "Reported" },
  { key: "hidden", label: "Hidden" },
  { key: "recent", label: "All recent" },
];

/**
 * Comment moderation queue. Signed-in only (proxy), then admins only: the Clerk role is
 * checked server-side here and on every action; anyone else gets a 404.
 */
export default function ModerationPage({ searchParams }: PageProps<"/admin/comments">) {
  return (
    <div className="relative flex w-full flex-1 flex-col overflow-clip bg-background">
      <SiteHeader />
      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-6 pt-10 pb-16 sm:px-10">
        <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-2xl bg-neutral-50" />}>
          <Moderation searchParams={searchParams} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function Moderation({ searchParams }: { searchParams: PageProps<"/admin/comments">["searchParams"] }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/admin/comments");
  if ((await getRole(userId)) !== "admin") notFound();

  const requested = (await searchParams).filter;
  const filter: ModerationFilter = FILTERS.some((f) => f.key === requested) ? (requested as ModerationFilter) : "reported";
  const rows = await moderationQueue(filter);

  return (
    <>
      <h1 className="font-display text-display-1 text-foreground">Moderation</h1>
      <p className="mt-3 text-body-lg text-muted">Review reported and hidden comments across all lessons.</p>

      <nav aria-label="Filter" className="mt-8 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/comments?filter=${f.key}`}
            aria-current={f.key === filter ? "page" : undefined}
            className={cn(
              "inline-flex h-9 items-center rounded-full px-4 text-body font-medium transition-colors",
              f.key === filter
                ? "bg-linear-to-b from-[#e4e4e7] to-[#a1a1aa] text-neutral-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_12px_rgba(0,0,0,0.35)]"
                : "bg-white/6 text-[#d4d4d8] ring-1 ring-white/10 ring-inset hover:bg-white/10",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-white/10 bg-linear-to-b from-white/6 to-white/2 px-6 py-12 text-center text-body-lg text-muted">
          Nothing to review here.
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {rows.map((row) => (
            <li
              key={row.id}
              className={cn(
                "rounded-2xl border border-white/10 bg-linear-to-b from-white/6 to-white/2 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
                row.hidden && "opacity-70",
              )}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-subtle">
                <span className="font-semibold text-foreground">{row.authorName}</span>
                <span>· {row.isReply ? "Reply" : "Comment"} on</span>
                {row.lessonSlug ? (
                  <Link href={`/lessons/${row.lessonSlug}`} className="text-[#d4d4d8] underline-offset-2 hover:underline">
                    {row.lessonTitle}
                  </Link>
                ) : (
                  <span>{row.lessonTitle}</span>
                )}
                <span>· {new Date(row.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
                {row.hidden && <span className="font-semibold text-red-300">· Hidden</span>}
                {row.deleted && <span>· Deleted by author</span>}
              </div>
              <p className="mt-2 text-body leading-6 break-words whitespace-pre-wrap text-[#d4d4d8]">
                {row.deleted ? <em className="text-subtle">Comment deleted</em> : row.body}
              </p>
              {row.reports.length > 0 && (
                <div className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-small text-red-100/90">
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

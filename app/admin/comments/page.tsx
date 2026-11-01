import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminFrame, AdminShell, AdminSkeleton } from "@/components/admin/admin-shell";
import { ModerationList, parseModerationFilter } from "@/components/comments/moderation-list";
import { Panel } from "@/components/settings/settings-shell";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { requireAdminPage } from "@/lib/admin";
import { moderationQueue } from "@/lib/comments";

export const metadata: Metadata = { title: "Moderation · Admin · Roam", robots: { index: false } };

/**
 * Comment moderation queue, inside the admin console (prompts/admin-console.md). Admins only,
 * checked server-side here and on every action; anyone else gets a 404.
 */
export default function ModerationPage({ searchParams }: PageProps<"/admin/comments">) {
  return (
    <div className="relative flex w-full flex-1 flex-col overflow-clip bg-background">
      <SiteHeader />
      <AdminFrame>
        <h1 className="sr-only">Comment moderation</h1>
        <Suspense fallback={<AdminSkeleton />}>
          <Moderation searchParams={searchParams} />
        </Suspense>
      </AdminFrame>
      <SiteFooter />
    </div>
  );
}

async function Moderation({ searchParams }: { searchParams: PageProps<"/admin/comments">["searchParams"] }) {
  const ctx = await requireAdminPage("/admin/comments");
  const filter = parseModerationFilter((await searchParams).filter);
  const rows = await moderationQueue(filter);

  return (
    <AdminShell active="comments" ctx={ctx}>
      <Panel title="Comments" description="Reported and hidden comments across all lessons." className="w-full">
        <ModerationList rows={rows} filter={filter} filterHref={(f) => `/admin/comments?filter=${f}`} />
      </Panel>
    </AdminShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminFrame, AdminShell, AdminSkeleton } from "@/components/admin/admin-shell";
import { auditLabel, AuditRows } from "@/components/admin/audit-rows";
import { Panel } from "@/components/settings/settings-shell";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { requireAdminPage } from "@/lib/admin";
import { AUDIT_PAGE_SIZE, auditActions, recentAuditEntries } from "@/lib/admin-data";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Audit log · Admin · Roam", robots: { index: false } };

/**
 * Every admin action, newest first (prompts/admin-console.md). Read-only: the database
 * rejects updates and deletes on the audit table.
 */
export default function AdminAuditPage({ searchParams }: PageProps<"/admin/audit">) {
  return (
    <div className="relative flex w-full flex-1 flex-col overflow-clip bg-background">
      <SiteHeader />
      <AdminFrame>
        <h1 className="sr-only">Audit log</h1>
        <Suspense fallback={<AdminSkeleton />}>
          <Audit searchParams={searchParams} />
        </Suspense>
      </AdminFrame>
      <SiteFooter />
    </div>
  );
}

const PILL = "inline-flex h-8 items-center rounded-full px-3 text-small font-medium transition-colors";

async function Audit({ searchParams }: { searchParams: PageProps<"/admin/audit">["searchParams"] }) {
  const ctx = await requireAdminPage("/admin/audit");
  const params = await searchParams;
  const actions = await auditActions();
  const action = typeof params.action === "string" && actions.includes(params.action) ? params.action : undefined;
  const page = Math.max(0, Math.min(1000, Number.parseInt(typeof params.page === "string" ? params.page : "0", 10) || 0));
  // One extra row tells us whether there's a next page.
  const rows = await recentAuditEntries({ limit: AUDIT_PAGE_SIZE + 1, offset: page * AUDIT_PAGE_SIZE, action });
  const hasNext = rows.length > AUDIT_PAGE_SIZE;
  const href = (p: number, a = action) => `/admin/audit?${new URLSearchParams({ ...(a ? { action: a } : {}), page: String(p) })}`;

  return (
    <AdminShell active="audit" ctx={ctx}>
      <Panel title="Audit log" description="Every admin action, who took it, and from where. Entries can't be edited or deleted." className="w-full">
        <nav aria-label="Filter" className="mb-3 flex flex-wrap gap-2">
          <Link href="/admin/audit" aria-current={!action ? "page" : undefined} className={cn(PILL, !action ? "bg-neutral-200 text-foreground" : "text-muted hover:text-foreground")}>
            All
          </Link>
          {actions.map((a) => (
            <Link key={a} href={href(0, a)} aria-current={a === action ? "page" : undefined} className={cn(PILL, a === action ? "bg-neutral-200 text-foreground" : "text-muted hover:text-foreground")}>
              {auditLabel(a)}
            </Link>
          ))}
        </nav>
        {rows.length === 0 ? <p className="text-body text-muted">No admin actions yet.</p> : <AuditRows rows={rows.slice(0, AUDIT_PAGE_SIZE)} />}
        {(page > 0 || hasNext) && (
          <nav aria-label="Pages" className="mt-4 flex gap-4 text-small">
            {page > 0 && (
              <Link href={href(page - 1)} className="text-foreground hover:underline">
                ← Newer
              </Link>
            )}
            {hasNext && (
              <Link href={href(page + 1)} className="text-foreground hover:underline">
                Older →
              </Link>
            )}
          </nav>
        )}
      </Panel>
    </AdminShell>
  );
}

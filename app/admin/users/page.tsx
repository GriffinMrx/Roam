import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ADMIN_TABLE, ADMIN_TD, ADMIN_TH, AdminFrame, AdminShell, AdminSkeleton } from "@/components/admin/admin-shell";
import { RoleChips } from "@/components/admin/role-chips";
import { Panel } from "@/components/settings/settings-shell";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { requireAdminPage } from "@/lib/admin";
import { searchUsers, USERS_PAGE_SIZE } from "@/lib/admin-data";

export const metadata: Metadata = { title: "Users · Admin · Roam", robots: { index: false } };

/** Every account, searchable (prompts/admin-console.md). Admins only (server-checked, 404 otherwise). */
export default function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  return (
    <div className="relative flex w-full flex-1 flex-col overflow-clip bg-background">
      <SiteHeader />
      <AdminFrame>
        <h1 className="sr-only">Users</h1>
        <Suspense fallback={<AdminSkeleton />}>
          <Users searchParams={searchParams} />
        </Suspense>
      </AdminFrame>
      <SiteFooter />
    </div>
  );
}

const day = (ms: number | null) => (ms ? new Date(ms).toLocaleDateString("en-US", { dateStyle: "medium" }) : "—");

async function Users({ searchParams }: { searchParams: PageProps<"/admin/users">["searchParams"] }) {
  const ctx = await requireAdminPage("/admin/users");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const page = Math.max(0, Math.min(1000, Number.parseInt(typeof params.page === "string" ? params.page : "0", 10) || 0));
  const { users, total } = await searchUsers(q, page);
  const pages = Math.max(1, Math.ceil(total / USERS_PAGE_SIZE));
  const href = (p: number) => `/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <AdminShell active="users" ctx={ctx}>
      <Panel title="Users" description={`${total} ${total === 1 ? "account" : "accounts"}${q ? ` matching “${q}”` : ""}.`} className="w-full">
        <form action="/admin/users" className="mb-4 flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name, email, or user id"
            aria-label="Search users"
            className="h-9 w-80 max-w-full rounded-[6px] border border-border bg-surface px-3 text-small text-foreground placeholder:text-subtle focus:border-primary-400 focus:outline-none"
          />
          <button type="submit" className="inline-flex h-9 items-center rounded-[6px] bg-neutral-200 px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-neutral-300">
            Search
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className={ADMIN_TABLE}>
            <thead>
              <tr>
                <th className={ADMIN_TH}>Account</th>
                <th className={ADMIN_TH}>Status</th>
                <th className={ADMIN_TH}>Onboarded</th>
                <th className={ADMIN_TH}>Joined</th>
                <th className={ADMIN_TH}>Last active</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-neutral-50">
                  <td className={ADMIN_TD}>
                    <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3">
                      <Image src={u.imageUrl} alt="" width={28} height={28} className="size-7 rounded-full" />
                      <span className="min-w-0">
                        <span className="block truncate text-body text-foreground">{u.name}</span>
                        <span className="block truncate text-subtle">{u.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td className={ADMIN_TD}>
                    <RoleChips user={u} showTwoFactor />
                  </td>
                  <td className={ADMIN_TD}>{u.onboarded ? "Yes" : "No"}</td>
                  <td className={ADMIN_TD}>{day(u.createdAt)}</td>
                  <td className={ADMIN_TD}>{day(u.lastActiveAt)}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className={ADMIN_TD}>
                    No accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <nav aria-label="Pages" className="mt-4 flex items-center gap-3 text-small text-muted">
            {page > 0 && (
              <Link href={href(page - 1)} className="text-foreground hover:underline">
                ← Previous
              </Link>
            )}
            <span>
              Page {page + 1} of {pages}
            </span>
            {page + 1 < pages && (
              <Link href={href(page + 1)} className="text-foreground hover:underline">
                Next →
              </Link>
            )}
          </nav>
        )}
      </Panel>
    </AdminShell>
  );
}

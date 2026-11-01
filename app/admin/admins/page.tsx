import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AdminFrame, AdminShell, AdminSkeleton } from "@/components/admin/admin-shell";
import { RoleChips } from "@/components/admin/role-chips";
import { AddAdminForm, RemoveAdminButton } from "@/components/admin/user-actions";
import { Panel } from "@/components/settings/settings-shell";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { requireAdminPage } from "@/lib/admin";
import { listAdmins } from "@/lib/admin-data";

export const metadata: Metadata = { title: "Admins · Admin · Roam", robots: { index: false } };

/**
 * Who can use the admin console (prompts/admin-console.md). Owner only: everyone else,
 * admins included, gets a 404. Owners come from server env and can't be changed here.
 */
export default function AdminAdminsPage() {
  return (
    <div className="relative flex w-full flex-1 flex-col overflow-clip bg-background">
      <SiteHeader />
      <AdminFrame>
        <h1 className="sr-only">Admins</h1>
        <Suspense fallback={<AdminSkeleton />}>
          <Admins />
        </Suspense>
      </AdminFrame>
      <SiteFooter />
    </div>
  );
}

async function Admins() {
  const ctx = await requireAdminPage("/admin/admins", { ownerOnly: true });
  const people = await listAdmins();

  return (
    <AdminShell active="admins" ctx={ctx}>
      <Panel title="Add an admin" description="They need an account first. Admins can monitor, moderate, review courses, and ban learners. Only you manage admins." className="w-full">
        <AddAdminForm />
      </Panel>

      <Panel title="Admins" description="The owner is set on the server (ROAM_OWNER_USER_IDS) and can't be removed here." className="w-full">
        <ul className="flex flex-col divide-y divide-ink/5">
          {people.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <Image src={p.imageUrl} alt="" width={32} height={32} className="size-8 rounded-full" />
              <Link href={`/admin/users/${p.id}`} className="min-w-0 flex-1">
                <span className="block truncate text-body text-foreground hover:underline">{p.name}</span>
                <span className="block truncate text-small text-subtle">
                  {p.email}
                  {p.addedAt && ` · added ${new Date(p.addedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}`}
                </span>
              </Link>
              <RoleChips user={p} showTwoFactor />
              {p.role === "admin" && <RemoveAdminButton userId={p.id} />}
            </li>
          ))}
        </ul>
      </Panel>
    </AdminShell>
  );
}

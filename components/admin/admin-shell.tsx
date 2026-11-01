import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { AdminContext } from "@/lib/admin";

/*
 * Admin console layout (prompts/admin-console.md): the same full-height menu and compact-card
 * content area as Settings (components/settings/settings-shell.tsx).
 */

export type AdminTab = "overview" | "users" | "courses" | "comments" | "insights" | "audit" | "admins";

const MONITOR: { key: AdminTab; label: string; icon: IconName; href: string }[] = [
  { key: "overview", label: "Overview", icon: "chart", href: "/admin" },
  { key: "users", label: "Users", icon: "users-group", href: "/admin/users" },
  { key: "courses", label: "Course review", icon: "book-open", href: "/admin/courses" },
  { key: "comments", label: "Comments", icon: "chat", href: "/admin/comments" },
  { key: "insights", label: "Insights", icon: "chart-alt", href: "/admin/insights" },
  { key: "audit", label: "Audit log", icon: "file-word", href: "/admin/audit" },
];

const OWNER: { key: AdminTab; label: string; icon: IconName; href: string }[] = [
  { key: "admins", label: "Admins", icon: "shield", href: "/admin/admins" },
];

const STUDIO_URL = process.env.NEXT_PUBLIC_SANITY_STUDIO_URL || "http://localhost:3333";

/** Same menu row as Settings: icon + label, no background; the active row is brighter. */
const MENU_ITEM =
  "inline-flex h-8 items-center gap-2.5 rounded-sm px-2 text-body whitespace-nowrap transition-colors lg:flex lg:w-full";
const LABEL = "hidden px-2 text-[11px] font-semibold tracking-wide text-muted uppercase lg:block";

function MenuLink({ item, active }: { item: (typeof MONITOR)[number]; active: boolean }) {
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(MENU_ITEM, active ? "font-medium text-foreground" : "text-muted hover:text-foreground")}
      >
        <Icon name={item.icon} size={18} />
        {item.label}
      </Link>
    </li>
  );
}

export function AdminShell({ active, ctx, children }: { active: AdminTab; ctx: AdminContext; children: ReactNode }) {
  const blocked = ctx.mfaRequired && !ctx.mfa;
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <nav
        aria-label="Admin"
        className="shrink-0 border-b border-border bg-background px-6 py-3 lg:w-60 lg:border-r lg:border-b-0 lg:px-3 lg:py-6"
      >
        <p className={LABEL}>Admin</p>
        <ul className="-mx-6 flex gap-1 overflow-x-auto px-6 lg:mx-0 lg:mt-3 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0">
          {MONITOR.map((item) => (
            <MenuLink key={item.key} item={item} active={item.key === active} />
          ))}
          {ctx.owner && (
            <>
              <li aria-hidden className="hidden lg:mt-5 lg:mb-2 lg:block">
                <p className={LABEL}>Owner</p>
              </li>
              {OWNER.map((item) => (
                <MenuLink key={item.key} item={item} active={item.key === active} />
              ))}
            </>
          )}
          <li aria-hidden className="hidden lg:mt-5 lg:mb-2 lg:block">
            <p className={LABEL}>Content</p>
          </li>
          <li>
            <a href={STUDIO_URL} target="_blank" rel="noreferrer noopener" className={cn(MENU_ITEM, "text-muted hover:text-foreground")}>
              <Icon name="link-external" size={18} />
              Sanity Studio
            </a>
          </li>
          <li className="lg:mt-5">
            <Link href="/" className={cn(MENU_ITEM, "text-muted hover:text-foreground")}>
              <Icon name="arrow-right" size={18} className="rotate-180" />
              Back to site
            </Link>
          </li>
        </ul>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col items-start gap-4 bg-neutral-50 p-4 sm:p-5">
        {!ctx.mfa && (
          <p role="status" className="w-full rounded-sm bg-amber-500/10 px-4 py-3 text-small text-amber-600 light:text-amber-700">
            {blocked ? "The admin console needs two-factor authentication." : "Your account has no two-factor authentication."} Turn it
            on in{" "}
            <Link href="/settings?tab=account" className="font-medium underline">
              Settings → Account
            </Link>
            {blocked ? " to continue." : " to protect the admin console."}
          </p>
        )}
        {blocked ? null : children}
      </div>
    </div>
  );
}

/** Page wrapper shared by every admin page: site header, menu + cards, site footer. */
export function AdminFrame({ children }: { children: ReactNode }) {
  return <main className="relative z-10 flex w-full flex-1 flex-col">{children}</main>;
}

/** Menu + two card placeholders while the admin check and data load. */
export function AdminSkeleton() {
  return (
    <div aria-hidden className="flex flex-1 flex-col lg:flex-row">
      <div className="h-14 shrink-0 border-b border-border lg:h-auto lg:w-60 lg:border-r lg:border-b-0" />
      <div className="flex flex-1 flex-col gap-4 bg-neutral-50 p-4 sm:p-5">
        <div className="h-40 w-full animate-pulse rounded-sm bg-neutral-100" />
        <div className="h-64 w-full animate-pulse rounded-sm bg-neutral-100" />
      </div>
    </div>
  );
}

export const ADMIN_TABLE = "w-full text-left text-small";
export const ADMIN_TH = "border-b border-ink/8 px-3 py-2 text-[11px] font-semibold tracking-wide text-muted uppercase";
export const ADMIN_TD = "border-b border-ink/5 px-3 py-2.5 align-middle text-soft";

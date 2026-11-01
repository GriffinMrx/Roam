import Link from "next/link";
import type { ReactNode } from "react";
import { SignOutButton } from "@clerk/nextjs";
import { Icon, MaybeIcon } from "@/components/ui";
import { cn } from "@/lib/cn";

/*
 * Settings layout (prompts/settings-sidebar-cards.md): a full-height menu and a content area
 * of compact cards. Teachers also get a Teaching group (prompts/teachers-phase-1.md); becoming
 * a teacher happens on /onboarding (prompts/onboarding-survey-review-and-phase-2.md).
 */

export const SETTINGS_TABS = [
  { key: "account", label: "Account", icon: "user" },
  { key: "learning", label: "Learning", icon: "play-circle" },
  { key: "appearance", label: "Appearance", icon: "settings" },
  { key: "data", label: "Your data", icon: "folder" },
] as const;

export const TEACHING_TABS = [
  { key: "courses", label: "My courses", icon: "book-open" },
  { key: "teaching-comments", label: "Comments", icon: "chat" },
  { key: "teacher-profile", label: "Teacher profile", icon: "star" },
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number]["key"] | (typeof TEACHING_TABS)[number]["key"];

/** Menu row: icon + label, no background; the active row is just brighter (reference). */
const MENU_ITEM =
  "inline-flex h-8 items-center gap-2.5 rounded-sm px-2 text-body whitespace-nowrap transition-colors lg:flex lg:w-full";
const LABEL = "hidden px-2 text-[11px] font-semibold tracking-wide text-muted uppercase lg:block";

function MenuLink({ tab, active }: { tab: { key: string; label: string; icon: string }; active: boolean }) {
  return (
    <li>
      <Link
        href={`/settings?tab=${tab.key}`}
        aria-current={active ? "page" : undefined}
        className={cn(MENU_ITEM, active ? "font-medium text-foreground" : "text-muted hover:text-foreground")}
      >
        <MaybeIcon name={tab.icon} size={18} />
        {tab.label}
      </Link>
    </li>
  );
}

export function SettingsShell({
  active,
  isTeacher,
  children,
}: {
  active: SettingsTab;
  isTeacher: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <nav
        aria-label="Settings"
        className="shrink-0 border-b border-border bg-background px-6 py-3 lg:w-60 lg:border-r lg:border-b-0 lg:px-3 lg:py-6"
      >
        <p className={LABEL}>Settings</p>
        <ul className="-mx-6 flex gap-1 overflow-x-auto px-6 lg:mx-0 lg:mt-3 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0">
          {SETTINGS_TABS.map((t) => (
            <MenuLink key={t.key} tab={t} active={t.key === active} />
          ))}
          {isTeacher && (
            <>
              <li aria-hidden className="hidden lg:mt-5 lg:mb-2 lg:block">
                <p className={LABEL}>Teaching</p>
              </li>
              {TEACHING_TABS.map((t) => (
                <MenuLink key={t.key} tab={t} active={t.key === active} />
              ))}
            </>
          )}
          <li className="lg:mt-5">
            <SignOutButton redirectUrl="/">
              <button type="button" className={cn(MENU_ITEM, "text-muted hover:text-foreground")}>
                <Icon name="arrow-right" size={18} className="rotate-180" />
                Sign out
              </button>
            </SignOutButton>
          </li>
        </ul>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col items-start gap-4 bg-neutral-50 p-4 sm:p-5">{children}</div>
    </div>
  );
}

/** Reference card: as wide as its content, one step lighter than the content area, no border. */
export function Panel({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("w-fit max-w-full rounded-sm bg-neutral-100 p-5", className)}>
      <h2 className="text-heading-1 text-foreground">{title}</h2>
      <p className="mt-0.5 text-small text-muted">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

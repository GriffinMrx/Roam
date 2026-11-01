import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { SignOutButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { AccountPanel } from "@/components/settings/account-panel";
import { ConfirmAction, DownloadDataButton } from "@/components/settings/data-actions";
import { PreferencesForm } from "@/components/settings/preferences-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Icon, MaybeIcon } from "@/components/ui";
import { cn } from "@/lib/cn";
import { readPreferences } from "@/lib/preferences";
import { readSettingsData } from "@/sanity/progress";

export const metadata: Metadata = { title: "Settings · Roam" };

const TABS = [
  { key: "account", label: "Account", icon: "user" },
  { key: "learning", label: "Learning", icon: "play-circle" },
  { key: "data", label: "Your data", icon: "folder" },
] as const;
type Tab = (typeof TABS)[number]["key"];

/**
 * Learner settings. Signed-in only (the proxy gates it, and every read below re-checks
 * the session). Per-user reads happen behind Suspense (cacheComponents).
 */
export default function SettingsPage({ searchParams }: PageProps<"/settings">) {
  return (
    <div className="relative flex w-full flex-1 flex-col overflow-clip bg-background">
      <SiteHeader />

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-6 pt-10 pb-16 sm:px-10">
        <h1 className="font-display text-display-1 text-foreground">Settings</h1>
        <p className="mt-3 text-body-lg text-muted">Manage your account, learning preferences, and data.</p>

        <Suspense fallback={<SettingsSkeleton />}>
          <SettingsContent searchParams={searchParams} />
        </Suspense>
      </main>

      <SiteFooter />
    </div>
  );
}

async function SettingsContent({ searchParams }: { searchParams: PageProps<"/settings">["searchParams"] }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/settings");

  const requested = (await searchParams).tab;
  const tab: Tab = TABS.some((t) => t.key === requested) ? (requested as Tab) : "account";

  return (
    <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:gap-12">
      <nav aria-label="Settings" className="lg:w-56 lg:shrink-0">
        <ul className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 sm:mx-0 sm:px-0 lg:flex-col">
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <li key={t.key}>
                <Link
                  href={`/settings?tab=${t.key}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-10 items-center gap-2.5 rounded-full px-4 text-body font-medium whitespace-nowrap transition-colors lg:flex lg:w-full",
                    active
                      ? "bg-linear-to-b from-[#e4e4e7] to-[#a1a1aa] text-neutral-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_12px_rgba(0,0,0,0.35)]"
                      : "text-[#d4d4d8] hover:bg-white/6",
                  )}
                >
                  <MaybeIcon name={t.icon} size={18} />
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <SignOutButton redirectUrl="/">
          <button
            type="button"
            className="mt-2 inline-flex h-10 items-center gap-2.5 rounded-full px-4 text-body font-medium whitespace-nowrap text-muted transition-colors hover:bg-white/6 hover:text-foreground lg:mt-6 lg:flex lg:w-full"
          >
            <Icon name="arrow-right" size={18} className="rotate-180" />
            Sign out
          </button>
        </SignOutButton>
      </nav>

      <div className="min-w-0 flex-1">
        {tab === "account" && <AccountPanel />}
        {tab === "learning" && <LearningTab userId={userId} />}
        {tab === "data" && <DataTab userId={userId} />}
      </div>
    </div>
  );
}

function Panel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-linear-to-b from-white/6 to-white/2 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_40px_-24px_rgba(0,0,0,0.8)] sm:p-8">
      <h2 className="text-heading-2 text-foreground">{title}</h2>
      <p className="mt-1 text-body text-muted">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

async function LearningTab({ userId }: { userId: string }) {
  const preferences = await readPreferences(userId);
  return (
    <Panel title="Learning preferences" description="How lesson videos behave for you.">
      <PreferencesForm initial={preferences} />
    </Panel>
  );
}

async function DataTab({ userId }: { userId: string }) {
  const { courses, bookmarkCount } = await readSettingsData(userId);
  return (
    <div className="flex flex-col gap-6">
      <Panel title="Course progress" description="Reset a course to start it over. This can't be undone.">
        {courses.length === 0 ? (
          <p className="py-4 text-body text-muted">You haven&rsquo;t started a course yet.</p>
        ) : (
          <ul className="divide-y divide-white/6">
            {courses.map((course) => (
              <li key={course.courseId} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-body-lg text-foreground">{course.title ?? "Untitled course"}</p>
                  <p className="text-small text-subtle">
                    {course.lessonsTracked ?? 0} {course.lessonsTracked === 1 ? "lesson" : "lessons"} tracked
                  </p>
                </div>
                <ConfirmAction
                  label="Reset progress"
                  confirmLabel="Confirm reset"
                  doneLabel="Progress reset"
                  payload={{ action: "reset-progress", courseId: course.courseId ?? "" }}
                />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Bookmarks" description="Remove every saved course and lesson. This can't be undone.">
        <div className="flex flex-col gap-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body-lg text-foreground">
            {bookmarkCount} saved {bookmarkCount === 1 ? "item" : "items"}
          </p>
          {bookmarkCount > 0 && (
            <ConfirmAction
              label="Clear all bookmarks"
              confirmLabel="Confirm clear"
              doneLabel="Bookmarks cleared"
              payload={{ action: "clear-bookmarks" }}
            />
          )}
        </div>
      </Panel>

      <Panel title="Download your data" description="A JSON file with your course progress and bookmarks.">
        <div className="py-2">
          <DownloadDataButton />
        </div>
      </Panel>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div aria-hidden className="mt-10 flex animate-pulse flex-col gap-8 lg:flex-row lg:gap-12">
      <div className="flex gap-2 lg:w-56 lg:flex-col">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 w-28 rounded-full bg-neutral-100 lg:w-full" />
        ))}
      </div>
      <div className="h-96 flex-1 rounded-2xl bg-neutral-50" />
    </div>
  );
}

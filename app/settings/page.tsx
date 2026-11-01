import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { ModerationList, parseModerationFilter } from "@/components/comments/moderation-list";
import { AccountPanel } from "@/components/settings/account-panel";
import { ConfirmAction, DownloadDataButton } from "@/components/settings/data-actions";
import { PreferencesForm } from "@/components/settings/preferences-form";
import { Panel, SETTINGS_TABS, SettingsShell, TEACHING_TABS, type SettingsTab } from "@/components/settings/settings-shell";
import { ThemeSwitch } from "@/components/settings/theme-switch";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CourseStatusBadge } from "@/components/teach/course-status";
import { NewCourseButton } from "@/components/teach/new-course-button";
import { TeacherProfileForm } from "@/components/teach/teacher-profile-form";
import { moderationQueue } from "@/lib/comments";
import { readPreferences } from "@/lib/preferences";
import type { CourseStatus } from "@/lib/teach/schema";
import { getTeacherProfile, listOwnCourses, ownLessonKeys } from "@/lib/teach/store";
import { readSettingsData } from "@/sanity/progress";

export const metadata: Metadata = { title: "Settings · Roam" };

const ALL_TABS = [...SETTINGS_TABS, ...TEACHING_TABS].map((t) => t.key) as string[];
const TEACHER_ONLY = new Set<string>(["courses", "teaching-comments", "teacher-profile"]);

/**
 * Learner settings, plus the Teaching area for teachers (prompts/teachers-phase-1.md).
 * Signed-in only (the proxy gates it, and every read below re-checks the session).
 * Per-user reads happen behind Suspense (cacheComponents).
 */
export default function SettingsPage({ searchParams }: PageProps<"/settings">) {
  return (
    <div className="relative flex w-full flex-1 flex-col overflow-clip bg-background">
      <SiteHeader />

      {/* Menu + cards between the site header and footer (prompts/settings-sidebar-cards.md) */}
      <main className="relative z-10 flex w-full flex-1 flex-col">
        <h1 className="sr-only">Settings</h1>
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

  const params = await searchParams;
  const profile = await getTeacherProfile(userId);
  const isTeacher = profile !== null;
  const tab = typeof params.tab === "string" && ALL_TABS.includes(params.tab) ? (params.tab as SettingsTab) : "account";
  // Teaching tabs need a teacher profile; becoming a teacher happens on the onboarding page.
  if (!isTeacher && TEACHER_ONLY.has(tab)) redirect("/onboarding?role=teacher");

  return (
    <SettingsShell active={tab} isTeacher={isTeacher}>
      {tab === "account" && (
        <Panel title="Account" description="Your profile, email addresses, password, and sessions.">
          <AccountPanel />
        </Panel>
      )}
      {tab === "learning" && <LearningTab userId={userId} />}
      {tab === "appearance" && <AppearanceTab />}
      {tab === "data" && <DataTab userId={userId} />}
      {tab === "courses" && <CoursesTab userId={userId} />}
      {tab === "teaching-comments" && <TeachingCommentsTab userId={userId} filter={parseModerationFilter(params.filter)} />}
      {tab === "teacher-profile" && profile && <TeacherProfileTab profile={profile} />}
    </SettingsShell>
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

/** Theme choice; client-only and per device (prompts/light-mode.md). */
function AppearanceTab() {
  return (
    <Panel title="Appearance" description="How Roam looks for you.">
      <ThemeSwitch />
    </Panel>
  );
}

async function DataTab({ userId }: { userId: string }) {
  const { courses, bookmarkCount } = await readSettingsData(userId);
  return (
    <>
      <Panel title="Course progress" description="Reset a course to start it over. This can't be undone.">
        {courses.length === 0 ? (
          <p className="py-4 text-body text-muted">You haven&rsquo;t started a course yet.</p>
        ) : (
          <ul className="divide-y divide-ink/6">
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
    </>
  );
}

/* ---------- Teaching (prompts/teachers-phase-1.md) ---------- */

async function CoursesTab({ userId }: { userId: string }) {
  const courses = await listOwnCourses(userId);
  return (
    <Panel title="My courses" description="Build a course, submit it for review, and manage it once it's live.">
      <NewCourseButton />
      {courses.length === 0 ? (
        <p className="mt-4 text-body text-muted">No courses yet. Start your first one above.</p>
      ) : (
        <ul className="mt-4 divide-y divide-ink/6">
          {courses.map((course) => (
            <li key={course.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-body-lg text-foreground">{course.title}</p>
                  <CourseStatusBadge status={course.status as CourseStatus} />
                </div>
                <p className="mt-0.5 text-small text-subtle">
                  {course.lessonCount} {course.lessonCount === 1 ? "lesson" : "lessons"} · {course.students}{" "}
                  {course.students === 1 ? "student" : "students"} · {course.completions} lessons completed · Updated{" "}
                  {course.updatedAt.toLocaleDateString("en-US", { dateStyle: "medium" })}
                </p>
                {course.status === "rejected" && course.reviewNote && (
                  <p className="mt-1 max-w-md text-small text-red-300 light:text-red-700">Review note: {course.reviewNote}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                {course.status === "published" && (
                  <Link
                    href={`/courses/${course.slug}`}
                    className="inline-flex h-8 items-center rounded-[6px] px-3 text-[13px] font-medium text-muted transition-colors hover:text-foreground"
                  >
                    View
                  </Link>
                )}
                <Link
                  href={`/settings/courses/${course.id}`}
                  className="inline-flex h-8 items-center rounded-[6px] bg-neutral-200 px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-neutral-300"
                >
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

async function TeachingCommentsTab({ userId, filter }: { userId: string; filter: ReturnType<typeof parseModerationFilter> }) {
  const rows = await moderationQueue(filter, await ownLessonKeys(userId));
  return (
    <Panel
      title="Comments"
      description="Discussions on your lessons. Pin, hide, or remove comments and review reports."
      className="w-full max-w-4xl"
    >
      <ModerationList rows={rows} filter={filter} filterHref={(f) => `/settings?tab=teaching-comments&filter=${f}`} />
    </Panel>
  );
}

function TeacherProfileTab({ profile }: { profile: NonNullable<Awaited<ReturnType<typeof getTeacherProfile>>> }) {
  return (
    <Panel title="Teacher profile" description="Shown on your instructor page and your courses.">
      <TeacherProfileForm
        initial={{ name: profile.name, headline: profile.headline, bio: profile.bio, expertise: profile.expertise }}
        isTeacher
        next="/settings?tab=courses"
      />
    </Panel>
  );
}

function SettingsSkeleton() {
  return (
    <div aria-hidden className="flex flex-1 animate-pulse flex-col lg:flex-row">
      <div className="flex shrink-0 gap-2 border-b border-border px-6 py-3 lg:w-60 lg:flex-col lg:gap-0.5 lg:border-r lg:border-b-0 lg:px-3 lg:py-6">
        <div className="hidden h-3 w-16 rounded-xs bg-neutral-100 lg:mx-2 lg:mb-3 lg:block" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-24 rounded-sm bg-neutral-100 lg:w-full" />
        ))}
      </div>
      <div className="flex-1 bg-neutral-50 p-4 sm:p-5">
        <div className="h-64 w-full max-w-xl rounded-sm bg-neutral-100" />
      </div>
    </div>
  );
}

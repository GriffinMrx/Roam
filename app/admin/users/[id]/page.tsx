import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminFrame, AdminShell, AdminSkeleton } from "@/components/admin/admin-shell";
import { RoleChips } from "@/components/admin/role-chips";
import { UserActions } from "@/components/admin/user-actions";
import { Panel } from "@/components/settings/settings-shell";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CourseStatusBadge } from "@/components/teach/course-status";
import { requireAdminPage } from "@/lib/admin";
import { activeSessionCount, getAdminUser, userActivity } from "@/lib/admin-data";
import { EXPERIENCE, GOALS, HEARD_FROM, PERSONAS, WEEKLY_TIME } from "@/lib/survey";

export const metadata: Metadata = { title: "User · Admin · Roam", robots: { index: false } };

/** One account: who they are, what they did, and the actions an admin may take (prompts/admin-console.md). */
export default function AdminUserPage({ params }: PageProps<"/admin/users/[id]">) {
  return (
    <div className="relative flex w-full flex-1 flex-col overflow-clip bg-background">
      <SiteHeader />
      <AdminFrame>
        <h1 className="sr-only">User</h1>
        <Suspense fallback={<AdminSkeleton />}>
          <UserDetail params={params} />
        </Suspense>
      </AdminFrame>
      <SiteFooter />
    </div>
  );
}

const when = (ms: number | null) => (ms ? new Date(ms).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "Never");
const labelOf = (options: readonly { value: string; label: string }[], value: string | null) =>
  value ? (options.find((o) => o.value === value)?.label ?? value) : "—";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-1.5 text-body">
      <dt className="w-40 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-soft">{children}</dd>
    </div>
  );
}

async function UserDetail({ params }: { params: PageProps<"/admin/users/[id]">["params"] }) {
  const { id } = await params;
  const ctx = await requireAdminPage(`/admin/users/${id}`);
  if (!/^user_[A-Za-z0-9]{10,64}$/.test(id)) notFound();
  const found = await getAdminUser(id);
  if (!found) notFound();
  const { row, user } = found;
  const [activity, sessions] = await Promise.all([userActivity(id), activeSessionCount(id)]);

  // Mirrors assertCanActOn (the server enforces it again on every action).
  const canAct = id !== ctx.userId && row.role !== "owner" && (ctx.owner || row.role !== "admin");
  const survey = activity.survey;

  return (
    <AdminShell active="users" ctx={ctx}>
      <Link href="/admin/users" className="text-small text-muted hover:text-foreground">
        ← All users
      </Link>

      <Panel title={row.name} description={row.email ?? "No email"} className="w-full">
        <div className="flex flex-wrap items-start gap-6">
          <Image src={row.imageUrl} alt="" width={64} height={64} className="size-16 rounded-full" />
          <dl className="min-w-0 flex-1">
            <Row label="Status">
              <RoleChips user={row} showTwoFactor />
              {!row.role && !row.teacher && !row.banned && "Learner"}
            </Row>
            <Row label="User id">
              <code className="text-small">{row.id}</code>
            </Row>
            <Row label="Joined">{when(row.createdAt)}</Row>
            <Row label="Last active">{when(row.lastActiveAt)}</Row>
            <Row label="Last sign-in">{when(user.lastSignInAt)}</Row>
            <Row label="Two-factor">{row.twoFactor ? "On" : "Off"}</Row>
            <Row label="Active sessions">{sessions}</Row>
          </dl>
        </div>
      </Panel>

      <Panel title="Actions" description="Every action asks you to verify it's you, and is written to the audit log." className="w-full">
        <UserActions userId={id} banned={row.banned} isAdmin={row.role === "admin"} viewerIsOwner={ctx.owner} canAct={canAct} />
      </Panel>

      <div className="grid w-full gap-4 xl:grid-cols-2">
        <Panel title="Onboarding answers" description={survey ? `Saved ${survey.updatedAt.toLocaleDateString("en-US", { dateStyle: "medium" })}.` : "Not answered yet."} className="w-full">
          {survey && (
            <dl>
              <Row label="Wants to">{survey.intent === "teach" ? "Teach" : "Learn"}</Row>
              <Row label="Describes self as">{labelOf(PERSONAS, survey.persona)}</Row>
              <Row label="Heard from">
                {labelOf(HEARD_FROM, survey.heardFrom)}
                {survey.heardFromOther && ` (${survey.heardFromOther})`}
              </Row>
              <Row label="Goals">{survey.goals.map((g) => labelOf(GOALS, g)).join(", ") || "—"}</Row>
              <Row label="Topics">{survey.interests.join(", ") || "—"}</Row>
              <Row label="Level">{labelOf(EXPERIENCE, survey.level)}</Row>
              <Row label="Time per week">{labelOf(WEEKLY_TIME, survey.weeklyTime)}</Row>
            </dl>
          )}
        </Panel>

        <Panel title="Learning" description="Course progress and badges." className="w-full">
          {activity.learning.length === 0 && activity.teacherLessonsCompleted === 0 ? (
            <p className="text-body text-muted">No progress yet.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-body">
              {activity.learning.map((l, i) => (
                <li key={i} className="flex justify-between gap-4">
                  <span className="truncate text-soft">{l.course}</span>
                  <span className="shrink-0 text-subtle tabular-nums">
                    {l.done}/{l.total} lessons
                  </span>
                </li>
              ))}
              {activity.teacherLessonsCompleted > 0 && (
                <li className="flex justify-between gap-4">
                  <span className="text-soft">Teacher courses</span>
                  <span className="text-subtle tabular-nums">{activity.teacherLessonsCompleted} lessons completed</span>
                </li>
              )}
            </ul>
          )}
          <p className="mt-3 text-small text-muted">
            {activity.badges.length} {activity.badges.length === 1 ? "badge" : "badges"} earned
          </p>
        </Panel>

        <Panel title="Discussion" description="Comments across all lessons." className="w-full">
          <dl>
            <Row label="Comments">{activity.comments.total}</Row>
            <Row label="Hidden by moderators">{activity.comments.hidden}</Row>
            <Row label="Reported">{activity.comments.reported}</Row>
          </dl>
          <Link href="/admin/comments?filter=recent" className="mt-2 inline-block text-small text-primary-500 hover:text-primary-600">
            Moderation queue →
          </Link>
        </Panel>

        <Panel title="Teaching" description={activity.teacher ? `Teacher profile: ${activity.teacher.name}` : "Not a teacher."} className="w-full">
          {activity.courses.length === 0 ? (
            <p className="text-body text-muted">No courses.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-body">
              {activity.courses.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-4">
                  <span className="truncate text-soft">{c.title || "Untitled course"}</span>
                  <CourseStatusBadge status={c.status} />
                </li>
              ))}
            </ul>
          )}
          {activity.teacher && (
            <Link href={`/instructors/${activity.teacher.slug}`} className="mt-3 inline-block text-small text-primary-500 hover:text-primary-600">
              Public teacher page →
            </Link>
          )}
        </Panel>
      </div>
    </AdminShell>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AdminFrame, AdminShell, AdminSkeleton } from "@/components/admin/admin-shell";
import { AuditRows } from "@/components/admin/audit-rows";
import { RangeControl } from "@/components/admin/charts/range-control";
import { SegmentedBar } from "@/components/admin/charts/segmented-bar";
import { StatTile } from "@/components/admin/charts/stat-tile";
import { TimeChart } from "@/components/admin/charts/time-chart";
import { RoleChips } from "@/components/admin/role-chips";
import { Panel } from "@/components/settings/settings-shell";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { requireAdminPage } from "@/lib/admin";
import { cn } from "@/lib/cn";
import { overviewStats } from "@/lib/admin-data";
import { overviewSeries, parseRange, type RangeDays } from "@/lib/admin-series";

export const metadata: Metadata = { title: "Admin · Roam", robots: { index: false } };

/**
 * Admin overview (prompts/admin-console.md, charts in prompts/admin-charts-and-hardening.md):
 * live numbers and daily charts across the app. Admins only, checked on the server
 * (lib/admin.ts); everyone else gets a 404. The charts stream in their own boundary, so a
 * slow Clerk call doesn't hold up the rest.
 */
export default function AdminOverviewPage({ searchParams }: PageProps<"/admin">) {
  return (
    <div className="relative flex w-full flex-1 flex-col overflow-clip bg-background">
      <SiteHeader />
      <AdminFrame>
        <h1 className="sr-only">Admin overview</h1>
        <Suspense fallback={<AdminSkeleton />}>
          <Overview searchParams={searchParams} />
        </Suspense>
      </AdminFrame>
      <SiteFooter />
    </div>
  );
}

/** Course status uses the reserved status colors, always with a label in the legend. */
const STATUS_COLORS = {
  draft: { color: "var(--color-neutral-500)", label: "Draft" },
  pending: { color: "#fab219", label: "Waiting for review", ink: "dark" as const },
  published: { color: "#0ca30c", label: "Published" },
  rejected: { color: "#d03b3b", label: "Rejected" },
};

async function Overview({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  const ctx = await requireAdminPage("/admin");
  const range = parseRange((await searchParams).range);
  // Both start now and run side by side; the charts stream in when theirs is ready.
  const series = overviewSeries(range);
  const s = await overviewStats();
  const day = (ms: number) => new Date(ms).toLocaleDateString("en-US", { dateStyle: "medium" });

  return (
    <AdminShell active="overview" ctx={ctx}>
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <p className="text-small text-muted">Daily numbers are in UTC.</p>
        <RangeControl active={range} />
      </div>

      <Suspense fallback={<ChartsSkeleton />}>
        <Charts series={series} range={range} usersTotal={s.users.total} active7={s.users.active7} teachers={s.teachers} />
      </Suspense>

      <Panel title="Right now" description="Things that may need you." className="w-full">
        <ul className="flex flex-wrap gap-2">
          <StatTile label="Waiting for review" value={s.courses.pending} href="/admin/courses" />
          <StatTile label="Open reports" value={s.openReports} href="/admin/comments?filter=reported" />
          <StatTile label="Answered onboarding" value={s.surveys} href="/admin/insights" />
          <StatTile label="Lessons completed, all time" value={s.lessonsCompleted} />
          <StatTile label="Badges awarded" value={s.badges} />
        </ul>
      </Panel>

      <Panel title="Teacher courses by status" description="Every course a teacher has started." className="w-full">
        <SegmentedBar
          label="Teacher courses by status"
          segments={(Object.keys(STATUS_COLORS) as (keyof typeof STATUS_COLORS)[]).map((key) => ({
            key,
            value: s.courses[key],
            ...STATUS_COLORS[key],
          }))}
        />
      </Panel>

      <div className="grid w-full gap-4 xl:grid-cols-2">
        <Panel title="Newest accounts" description="The latest sign-ups." className="w-full">
          <ul className="flex flex-col gap-1">
            {s.recentUsers.map((u) => (
              <li key={u.id}>
                <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 rounded-sm px-2 py-1.5 transition-colors hover:bg-neutral-50">
                  <Image src={u.imageUrl} alt="" width={28} height={28} className="size-7 rounded-full" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body text-foreground">{u.name}</span>
                    <span className="block truncate text-small text-subtle">{u.email}</span>
                  </span>
                  <RoleChips user={u} />
                  <span className="shrink-0 text-small text-subtle">{day(u.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Recent admin actions" description="From the audit log." className="w-full">
          {s.recentAudit.length === 0 ? (
            <p className="text-body text-muted">Nothing yet.</p>
          ) : (
            <AuditRows rows={s.recentAudit} compact />
          )}
          <Link href="/admin/audit" className="mt-3 inline-block text-small text-primary-500 hover:text-primary-600">
            Full audit log →
          </Link>
        </Panel>
      </div>
    </AdminShell>
  );
}

async function Charts({
  series: pending,
  range,
  usersTotal,
  active7,
  teachers,
}: {
  series: ReturnType<typeof overviewSeries>;
  range: RangeDays;
  usersTotal: number;
  active7: number;
  teachers: number;
}) {
  const series = await pending;
  const values = (points: { value: number }[]) => points.map((p) => p.value);
  const change = (x: { total: number; previous: number }) => ({ total: x.total, previous: x.previous, days: range });

  return (
    <>
      <Panel title="People" description={`Accounts in Clerk, last ${range} days.`} className="w-full">
        <ul className="flex flex-wrap gap-2">
          <StatTile label="Users" value={usersTotal} href="/admin/users" />
          <StatTile label={`New in ${range} days`} value={series.signups.total} change={change(series.signups)} spark={values(series.signups.points)} />
          <StatTile label="Active this week" value={active7} />
          <StatTile label="Teachers" value={teachers} change={change(series.newTeachers)} hint={`${series.newTeachers.total} new in ${range} days`} />
        </ul>
      </Panel>

      <div className="grid w-full gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        <ChartPanel title="Sign-ups per day" total={series.signups.total} unit="sign-ups" change={change(series.signups)}>
          <TimeChart kind="column" points={series.signups.points} unit="sign-ups" label={`Sign-ups per day, last ${range} days`} />
          {series.signups.partial && <p className="mt-2 text-[12px] text-subtle">Daily bars show the latest 2,000 sign-ups; the total is exact.</p>}
        </ChartPanel>
        <ChartPanel title="Lessons completed per day" total={series.completions.total} unit="completions" change={change(series.completions)}>
          <TimeChart kind="area" points={series.completions.points} unit="completions" label={`Lessons completed per day, last ${range} days`} />
        </ChartPanel>
        <ChartPanel title="Comments per day" className="lg:col-span-2 2xl:col-span-1" total={series.comments.total} unit="comments" change={change(series.comments)}>
          <TimeChart kind="line" points={series.comments.points} unit="comments" label={`Comments per day, last ${range} days`} />
        </ChartPanel>
      </div>
    </>
  );
}

function ChartPanel({
  title,
  className,
  total,
  unit,
  change,
  children,
}: {
  title: string;
  className?: string;
  total: number;
  unit: string;
  change: { total: number; previous: number; days: number };
  children: React.ReactNode;
}) {
  const pct = change.previous ? Math.round(((change.total - change.previous) / change.previous) * 100) : null;
  return (
    <section className={cn("w-full rounded-sm bg-neutral-50 p-5", className)}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-heading-3 text-foreground">{title}</h2>
        <p className="text-small text-subtle tabular-nums">
          <span className="font-medium text-foreground">{total}</span> {unit}
          {pct !== null && ` · ${pct > 0 ? "+" : ""}${pct}% vs previous ${change.days} days`}
        </p>
      </div>
      {children}
    </section>
  );
}

function ChartsSkeleton() {
  return (
    <div aria-hidden className="grid w-full animate-pulse gap-4 xl:grid-cols-2">
      <div className="h-36 rounded-sm bg-neutral-100 xl:col-span-2" />
      <div className="h-64 rounded-sm bg-neutral-100" />
      <div className="h-64 rounded-sm bg-neutral-100" />
    </div>
  );
}

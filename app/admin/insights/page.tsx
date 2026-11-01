import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminFrame, AdminShell, AdminSkeleton } from "@/components/admin/admin-shell";
import { BarChart, type BarRow } from "@/components/admin/charts/bar-chart";
import { SegmentedBar } from "@/components/admin/charts/segmented-bar";
import { TimeChart } from "@/components/admin/charts/time-chart";
import { Panel } from "@/components/settings/settings-shell";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { requireAdminPage } from "@/lib/admin";
import { EXPERIENCE, GOALS, HEARD_FROM, PERSONAS, WEEKLY_TIME } from "@/lib/survey";
import { surveyInsights } from "@/lib/user-profile";
import { getCategories } from "@/sanity/data";

export const metadata: Metadata = { title: "Insights · Admin · Roam", robots: { index: false } };

/**
 * Who Roam's users are, from the onboarding survey (prompts/onboarding-survey-review-and-phase-2.md).
 * Inside the admin console (prompts/admin-console.md): admins only, server-side; others get a 404.
 * Totals only: no names, emails, or user ids.
 */
export default function InsightsPage() {
  return (
    <div className="relative flex w-full flex-1 flex-col overflow-clip bg-background">
      <SiteHeader />
      <AdminFrame>
        <h1 className="sr-only">Insights</h1>
        <Suspense fallback={<AdminSkeleton />}>
          <Insights />
        </Suspense>
      </AdminFrame>
      <SiteFooter />
    </div>
  );
}

type Row = { value: string; count: number };

/** Chart rows for one question. Ranked (largest first) for categories; scale order for levels. "Skipped" goes last. */
function rowsFor(rows: Row[], labels: Map<string, string>, scale?: readonly { value: string }[]): BarRow[] {
  const toBar = (r: Row): BarRow => ({ key: r.value || "none", label: labels.get(r.value) ?? (r.value || "Skipped"), count: r.count });
  if (scale) {
    const byValue = new Map(rows.map((r) => [r.value, r]));
    const ordered = scale.map((o) => toBar(byValue.get(o.value) ?? { value: o.value, count: 0 }));
    const rest = rows.filter((r) => !scale.some((o) => o.value === r.value)).map(toBar);
    return [...ordered, ...rest];
  }
  return [...rows].sort((a, b) => (a.value ? 0 : 1) - (b.value ? 0 : 1) || b.count - a.count).map(toBar);
}

function Question({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sm bg-neutral-50 p-5">
      <h2 className="text-heading-3 text-foreground">{title}</h2>
      {children}
    </section>
  );
}

/** At least the last 8 weeks, oldest first, with empty weeks filled in up to this week. */
function weeklyPoints(weekly: { week: string; count: number }[]) {
  if (weekly.length === 0) return [];
  const counts = new Map(weekly.map((w) => [w.week, w.count]));
  const WEEK = 7 * 86_400_000;
  const now = Date.now();
  const first = Math.min(Date.parse(`${weekly.at(-1)!.week}T00:00:00Z`), Date.parse(`${weekly[0].week}T00:00:00Z`) - 7 * WEEK);
  const points: { day: string; value: number }[] = [];
  for (let t = first; t <= now && points.length < 26; t += WEEK) {
    const day = new Date(t).toISOString().slice(0, 10);
    points.push({ day, value: counts.get(day) ?? 0 });
  }
  return points;
}

const labelsOf = (options: readonly { value: string; label: string }[]) => new Map(options.map((o) => [o.value, o.label]));

const count = (rows: Row[], value: string) => rows.find((r) => r.value === value)?.count ?? 0;

async function Insights() {
  const ctx = await requireAdminPage("/admin/insights");

  const [data, categories] = await Promise.all([surveyInsights(), getCategories()]);
  const total = data.total;

  return (
    <AdminShell active="insights" ctx={ctx}>
      <Panel
        title="Insights"
        description={`${total} ${total === 1 ? "person has" : "people have"} answered the onboarding questions.`}
        className="w-full"
      >
          <a
            href="/api/admin/insights"
            download
            className="inline-flex h-9 items-center rounded-[6px] bg-neutral-200 px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-neutral-300"
          >
            Download CSV
          </a>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Question title="Learn or teach">
            <div className="mt-4">
              <SegmentedBar
                label="Learn or teach"
                segments={[
                  { key: "learn", label: "Learn", value: count(data.intent, "learn"), color: "var(--chart-1)" },
                  { key: "teach", label: "Teach", value: count(data.intent, "teach"), color: "var(--chart-2)" },
                ]}
              />
            </div>
          </Question>
          <Question title="Answers per week">
            {data.weekly.length === 0 ? (
              <p className="mt-3 text-body text-muted">No answers yet.</p>
            ) : (
              <TimeChart className="mt-4" kind="column" period="week" points={weeklyPoints(data.weekly)} unit="answers" label="Onboarding answers per week" />
            )}
          </Question>
          <Question title="Who they are">
            <BarChart rows={rowsFor(data.persona, labelsOf(PERSONAS))} total={total} />
          </Question>
          <Question title="How they heard about Roam">
            <BarChart rows={rowsFor(data.heardFrom, labelsOf(HEARD_FROM))} total={total} />
            {data.heardFromOther.length > 0 && (
              <>
                <h3 className="mt-6 text-body font-medium text-foreground">&ldquo;Other&rdquo; sources</h3>
                <ul className="mt-2 space-y-1 text-small text-muted">
                  {data.heardFromOther.map((text, i) => (
                    <li key={i}>{text}</li>
                  ))}
                </ul>
              </>
            )}
          </Question>
          <Question title="Goals (pick any)">
            <BarChart rows={rowsFor(data.goals, labelsOf(GOALS))} total={total} />
          </Question>
          <Question title="Topics of interest (pick any)">
            <BarChart rows={rowsFor(data.interests, new Map(categories.map((c) => [c.slug ?? "", c.title ?? ""])))} total={total} />
          </Question>
          <Question title="Experience level">
            <BarChart rows={rowsFor(data.level, labelsOf(EXPERIENCE), EXPERIENCE)} total={total} />
          </Question>
          <Question title="Time per week">
            <BarChart rows={rowsFor(data.weeklyTime, labelsOf(WEEKLY_TIME), WEEKLY_TIME)} total={total} />
          </Question>
        </div>
      </Panel>
    </AdminShell>
  );
}

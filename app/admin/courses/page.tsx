import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminFrame, AdminShell, AdminSkeleton } from "@/components/admin/admin-shell";
import { Panel } from "@/components/settings/settings-shell";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CourseStatusBadge } from "@/components/teach/course-status";
import { ReviewActions } from "@/components/teach/review-actions";
import { formatDuration, formatLevel } from "@/lib/format";
import { requireAdminPage } from "@/lib/admin";
import { reviewQueue } from "@/lib/teach/store";
import { getCategories } from "@/sanity/data";

export const metadata: Metadata = { title: "Course review · Roam", robots: { index: false } };

/**
 * Teacher course review (prompts/teachers-phase-1.md). Signed-in only (proxy), then admins
 * only: the Clerk role is checked here and on every action; anyone else gets a 404.
 */
export default function CourseReviewPage() {
  return (
    <div className="relative flex w-full flex-1 flex-col overflow-clip bg-background">
      <SiteHeader />
      <AdminFrame>
        <Suspense fallback={<AdminSkeleton />}>
          <Review />
        </Suspense>
      </AdminFrame>
      <SiteFooter />
    </div>
  );
}

async function Review() {
  const ctx = await requireAdminPage("/admin/courses");

  const [courses, categories] = await Promise.all([reviewQueue(), getCategories()]);
  const categoryTitle = new Map(categories.map((c) => [c.slug, c.title]));
  const pending = courses.filter((c) => c.status === "pending").length;

  return (
    <AdminShell active="courses" ctx={ctx}>
      <h1 className="sr-only">Course review</h1>
      <Panel
        title="Course review"
        description={pending > 0 ? `${pending} ${pending === 1 ? "course is" : "courses are"} waiting for review. You can also decide in Sanity Studio's Course Review tool.` : "Nothing waiting for review."}
        className="w-full"
      >
        {courses.length === 0 ? (
          <p className="rounded-sm bg-neutral-50 px-6 py-12 text-center text-body text-muted">
            No teacher has submitted a course yet.
          </p>
        ) : (
          <ul className="space-y-4">
            {courses.map((course) => {
              const lessons = course.modules.flatMap((m) => m.lessons);
              const seconds = lessons.reduce((n, l) => n + l.durationSeconds, 0);
              return (
                <li key={course.id} className="rounded-sm bg-neutral-50 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-heading-2 text-foreground">{course.title}</h2>
                    <CourseStatusBadge status={course.status} />
                  </div>
                  <p className="mt-1 text-small text-subtle">
                    by{" "}
                    {course.teacherSlug ? (
                      <Link href={`/instructors/${course.teacherSlug}`} className="text-soft hover:underline">
                        {course.teacherName}
                      </Link>
                    ) : (
                      course.teacherName
                    )}{" "}
                    · {categoryTitle.get(course.categorySlug ?? "") ?? "No category"} · {formatLevel(course.level)} ·{" "}
                    {course.price > 0 ? `$${course.price}` : "Free"} · {course.modules.length} modules · {lessons.length} lessons ·{" "}
                    {formatDuration(seconds)}
                    {course.submittedAt && ` · Submitted ${new Date(course.submittedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}`}
                  </p>
                  {course.summary && <p className="mt-3 max-w-3xl text-body text-soft">{course.summary}</p>}
                  {course.reviewNote && <p className="mt-2 text-small text-muted">Last note: {course.reviewNote}</p>}

                  {/* Preview: the full outline with every video link, opened in a new tab */}
                  <details className="mt-4 text-body">
                    <summary className="cursor-pointer text-muted select-none hover:text-foreground">Preview course content</summary>
                    <ol className="mt-3 space-y-4">
                      {course.modules.map((m, mi) => (
                        <li key={m.id}>
                          <p className="font-medium text-foreground">
                            Module {mi + 1} · {m.title || "Untitled"}
                          </p>
                          {m.summary && <p className="text-small text-subtle">{m.summary}</p>}
                          <ol className="mt-2 space-y-2 border-l border-ink/10 pl-4">
                            {m.lessons.map((l, li) => (
                              <li key={l.id}>
                                <p className="text-soft">
                                  {mi + 1}.{li + 1} {l.title || "Untitled"}{" "}
                                  <span className="text-small text-subtle">
                                    · {formatDuration(l.durationSeconds)}
                                    {l.freePreview && " · Free preview"}
                                  </span>
                                </p>
                                {l.videoUrl && (
                                  <a href={l.videoUrl} target="_blank" rel="noreferrer noopener" className="text-small break-all text-primary-500 hover:underline">
                                    {l.videoUrl}
                                  </a>
                                )}
                                {l.summary && <p className="text-small text-muted">{l.summary}</p>}
                                {l.keyPoints.length > 0 && (
                                  <ul className="mt-1 list-disc pl-5 text-small text-muted">
                                    {l.keyPoints.map((p) => (
                                      <li key={p}>{p}</li>
                                    ))}
                                  </ul>
                                )}
                              </li>
                            ))}
                          </ol>
                        </li>
                      ))}
                    </ol>
                  </details>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <ReviewActions id={course.id} status={course.status} />
                    {course.status === "published" && (
                      <Link href={`/courses/${course.slug}`} className="text-body text-primary-500 hover:text-primary-600">
                        View live →
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </AdminShell>
  );
}

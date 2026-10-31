import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CourseModules, type CourseModuleItem } from "@/components/course-modules";
import { CourseProgressProvider } from "@/components/course-progress";
import { LearnButton, ProgressSummary } from "@/components/course-progress-ui";
import { FooterBars } from "@/components/footer-bars";
import { SiteHeader } from "@/components/site-header";
import {
  Badge,
  Breadcrumbs,
  buttonStyles,
  Icon,
  MaybeIcon,
} from "@/components/ui";
import { formatCount, formatDuration, formatLevel, plural } from "@/lib/format";
import { getCourse, getCourseSlugs } from "@/sanity/data";
import { urlFor } from "@/sanity/lib/image";

export async function generateStaticParams() {
  return getCourseSlugs();
}

export async function generateMetadata({ params }: PageProps<"/courses/[slug]">): Promise<Metadata> {
  const course = await getCourse((await params).slug);
  if (!course) return {};
  return { title: `${course.title} · Roam`, description: course.summary ?? undefined };
}

function Meta({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <li className="inline-flex items-center gap-2">
      <MaybeIcon name={icon} size={20} className="text-subtle" />
      {children}
    </li>
  );
}

/**
 * The header, frame, and footer render immediately; the course itself reads `params`,
 * so it sits behind Suspense to keep navigation instant (docs: guides/instant-navigation).
 */
export default function CoursePage({ params }: PageProps<"/courses/[slug]">) {
  return (
    <div className="relative flex w-full flex-1 flex-col overflow-clip bg-background">
      <SiteHeader />

      <main className="relative z-10 w-full flex-1 px-6 pt-8 sm:px-10">
        <Suspense fallback={<CourseSkeleton />}>
          <CourseContent params={params} />
        </Suspense>
      </main>

      <FooterBars />
    </div>
  );
}

/** Placeholder with the same block structure as the loaded page, so nothing shifts. */
function CourseSkeleton() {
  const block = "rounded-md bg-neutral-100";
  return (
    <div aria-hidden className="animate-pulse">
      <div className={`h-5 w-64 ${block}`} />
      <div className="mt-10 flex flex-col gap-8 md:flex-row md:gap-14">
        <div className="aspect-[280/326] w-full max-w-70 shrink-0 rounded-lg bg-neutral-100" />
        <div className="flex-1">
          <div className={`h-6 w-20 ${block}`} />
          <div className={`mt-6 h-14 w-3/4 ${block}`} />
          <div className={`mt-5 h-16 max-w-xl ${block}`} />
          <div className={`mt-8 h-5 max-w-lg ${block}`} />
          <div className={`mt-8 h-11 w-80 ${block}`} />
        </div>
      </div>
      <div className="mt-14 h-80 rounded-lg bg-neutral-50" />
      <div className="mt-12 h-72 rounded-lg bg-neutral-50" />
    </div>
  );
}

async function CourseContent({ params }: { params: PageProps<"/courses/[slug]">["params"] }) {
  const course = await getCourse((await params).slug);
  if (!course) notFound();

  const modules = course.modules ?? [];
  const totalDuration = formatDuration(course.durationSeconds);

  // Course structure for the learner's progress, which loads client-side from /api/progress.
  const shape = {
    modules: modules.map((m) => ({ key: m._key, lessonIds: (m.lessons ?? []).map((l) => l._id) })),
  };
  const slugs: Record<string, string> = Object.fromEntries(
    modules.flatMap((m) => (m.lessons ?? []).map((l) => [l._id, l.slug ?? ""])),
  );

  const moduleItems: CourseModuleItem[] = modules.map((module) => ({
    key: module._key,
    title: module.title ?? "",
    summary: module.summary ?? undefined,
    duration: formatDuration(module.durationSeconds),
    lessons: (module.lessons ?? []).map((lesson) => ({
      id: lesson._id,
      title: lesson.title ?? "",
      href: `/lessons/${lesson.slug}`,
      duration: formatDuration(lesson.durationSeconds),
      freePreview: Boolean(lesson.freePreview),
    })),
  }));

  return (
    <CourseProgressProvider courseId={course._id} course={shape}>
      <Breadcrumbs
        items={[{ label: "All Courses", href: "/#courses" }, { label: course.title ?? "" }]}
      />

      {/* Hero */}
      <section className="mt-10 flex flex-col gap-8 md:flex-row md:items-start md:gap-14">
        <div className="relative aspect-[280/326] w-full max-w-70 shrink-0 overflow-hidden rounded-lg bg-black">
          {course.coverImage?.asset && (
            <Image
              src={urlFor(course.coverImage).width(560).height(652).fit("crop").url()}
              alt={(course.coverImage as { alt?: string }).alt ?? ""}
              fill
              preload
              sizes="280px"
              className="object-cover"
            />
          )}
        </div>

        <div className="min-w-0 md:pt-0.5">
          {course.popular && <Badge variant="popular">Popular</Badge>}
          <h1 className="mt-6 font-display text-display-1 text-foreground sm:text-[3.5rem] sm:leading-[4rem]">
            {course.title}
          </h1>
          <p className="mt-5 max-w-xl text-body-lg leading-8 text-muted">{course.summary}</p>

          <ul className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-body text-muted">
            <Meta icon="chart">{formatLevel(course.level)}</Meta>
            <Meta icon="clock">{totalDuration}</Meta>
            <Meta icon="file">{plural(modules.length, "module")}</Meta>
            <Meta icon="users">{formatCount(course.studentCount)} students</Meta>
          </ul>

          <div className="mt-8 flex flex-wrap gap-4">
            <LearnButton slugs={slugs} />
            <button type="button" className={buttonStyles({ variant: "tertiary", className: "px-6" })}>
              <Icon name="bookmark" size={20} />
              Bookmark
            </button>
          </div>
        </div>
      </section>

      {/* What you'll learn */}
      {course.outcomes && course.outcomes.length > 0 && (
        <section
          aria-labelledby="outcomes-title"
          className="mt-14 rounded-lg border border-border bg-surface p-6 sm:p-8"
        >
          <h2 id="outcomes-title" className="text-heading-2 text-foreground">
            What you&rsquo;ll learn
          </h2>
          <ul className="mt-6 grid gap-6 md:grid-cols-2">
            {course.outcomes.map((outcome) => (
              <li
                key={outcome._key}
                className="flex flex-col gap-4 rounded-md border border-border p-6 sm:flex-row sm:gap-6"
              >
                <MaybeIcon name={outcome.icon ?? ""} size={48} className="shrink-0 text-primary-500" />
                <div className="min-w-0">
                  <h3 className="text-heading-3 text-foreground">{outcome.title}</h3>
                  <p className="mt-2 text-body leading-6 text-subtle">{outcome.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Course content */}
      <section id="course-content" aria-labelledby="content-title" className="mt-12 scroll-mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="content-title" className="text-heading-2 text-foreground">
            Course Content
          </h2>
          <p className="text-body text-muted">
            {plural(modules.length, "module")}
            <span aria-hidden className="mx-2">
              •
            </span>
            {totalDuration}
          </p>
        </div>
        <div className="mt-6">
          <CourseModules modules={moduleItems} />
        </div>
      </section>

      <ProgressSummary slugs={slugs} />
    </CourseProgressProvider>
  );
}
